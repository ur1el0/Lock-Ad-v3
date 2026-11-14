from io import BytesIO
from datetime import timedelta
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from celery.exceptions import Retry

from safety_data.ai_service import IncidentImageAnalysisError
from safety_data.models import IncidentReport
from safety_data.tasks import (
    MANUAL_REVIEW_MESSAGE,
    analyze_incident_image_task,
    recover_stale_incident_image_analysis,
    recover_stale_incident_image_analyses,
)


@override_settings(
    GEMINI_API_ENABLED=True,
    GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=True,
)
class IncidentImageAnalysisTaskTests(TestCase):
    def create_report_with_image(self):
        image_bytes = BytesIO()
        Image.new('RGB', (2, 2), color='green').save(image_bytes, format='PNG')
        return IncidentReport.objects.create(
            user=User.objects.create_user(username='reporter'),
            incident_type='HAZARD',
            latitude='14.6',
            longitude='121.0',
            image=SimpleUploadedFile(
                'evidence.png',
                image_bytes.getvalue(),
                content_type='image/png',
            ),
            analysis_status='PENDING',
        )

    def test_successful_analysis_is_saved_as_completed(self):
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                report = self.create_report_with_image()
                with patch('safety_data.tasks.recover_stale_incident_image_analysis.apply_async'):
                    with patch(
                        'safety_data.tasks.analyze_incident_image',
                        return_value='Visible sidewalk damage.',
                    ):
                        analyze_incident_image_task.run(report.pk)

                report.refresh_from_db()

        self.assertEqual(report.analysis_status, 'COMPLETED')
        self.assertEqual(report.ai_analysis, 'Visible sidewalk damage.')

    def test_permanent_analysis_failure_leaves_manual_review_note(self):
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                report = self.create_report_with_image()
                failure = IncidentImageAnalysisError(
                    'Provider unavailable.',
                    retryable=False,
                )
                with patch(
                    'safety_data.tasks.analyze_incident_image',
                    side_effect=failure,
                ), patch('safety_data.tasks.recover_stale_incident_image_analysis.apply_async'):
                    analyze_incident_image_task.run(report.pk)

                report.refresh_from_db()

        self.assertEqual(report.analysis_status, 'FAILED')
        self.assertEqual(report.ai_analysis, MANUAL_REVIEW_MESSAGE)

    def test_duplicate_delivery_does_not_claim_a_fresh_processing_report(self):
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                report = self.create_report_with_image()
                report.analysis_status = 'PROCESSING'
                report.analysis_started_at = timezone.now()
                report.save(update_fields=['analysis_status', 'analysis_started_at'])

                with patch('safety_data.tasks.analyze_incident_image') as analyze:
                    analyze_incident_image_task.run(report.pk)

        analyze.assert_not_called()
        report.refresh_from_db()
        self.assertEqual(report.analysis_status, 'PROCESSING')

    def test_stale_processing_report_can_be_reclaimed(self):
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                report = self.create_report_with_image()
                report.analysis_status = 'PROCESSING'
                report.analysis_started_at = timezone.now() - timedelta(minutes=2)
                report.save(update_fields=['analysis_status', 'analysis_started_at'])

                with patch('safety_data.tasks.recover_stale_incident_image_analysis.apply_async'):
                    with patch(
                        'safety_data.tasks.analyze_incident_image',
                        return_value='Analysis recovered after a worker restart.',
                    ) as analyze:
                        analyze_incident_image_task.run(report.pk)

                report.refresh_from_db()

        analyze.assert_called_once()
        self.assertEqual(report.analysis_status, 'COMPLETED')
        self.assertIsNone(report.analysis_started_at)

    def test_recovery_task_requeues_stale_analysis(self):
        report = IncidentReport.objects.create(
            user=User.objects.create_user(username='reporter'),
            incident_type='HAZARD',
            latitude='14.6',
            longitude='121.0',
            analysis_status='PROCESSING',
            analysis_started_at=timezone.now() - timedelta(minutes=2),
        )

        with patch('safety_data.tasks.analyze_incident_image_task.delay') as enqueue:
            recover_stale_incident_image_analysis.run(report.pk)

        enqueue.assert_called_once_with(report.pk)
        report.refresh_from_db()
        self.assertEqual(report.analysis_status, 'PENDING')
        self.assertIsNone(report.analysis_started_at)

    def test_transient_analysis_failure_schedules_a_retry(self):
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                report = self.create_report_with_image()
                with patch(
                    'safety_data.tasks.recover_stale_incident_image_analysis.apply_async'
                ), patch(
                    'safety_data.tasks.analyze_incident_image',
                    side_effect=IncidentImageAnalysisError('Provider timed out.'),
                ), patch.object(
                    analyze_incident_image_task,
                    'retry',
                    side_effect=Retry(),
                ) as retry:
                    with self.assertRaises(Retry):
                        analyze_incident_image_task.run(report.pk)

                report.refresh_from_db()

        retry.assert_called_once()
        self.assertEqual(retry.call_args.kwargs['countdown'], 60)
        self.assertEqual(report.analysis_status, 'PENDING')
        self.assertIsNone(report.analysis_started_at)

    @override_settings(
        GEMINI_API_ENABLED=False,
        GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=False,
    )
    def test_disabled_analysis_task_marks_report_for_manual_review_without_provider_call(self):
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                report = self.create_report_with_image()

                with patch('safety_data.tasks.analyze_incident_image') as analyze:
                    analyze_incident_image_task.run(report.pk)

                report.refresh_from_db()

        analyze.assert_not_called()
        self.assertEqual(report.analysis_status, 'NOT_REQUESTED')
        self.assertIsNone(report.analysis_started_at)

    @override_settings(
        GEMINI_API_ENABLED=False,
        GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=False,
    )
    def test_disabled_recovery_marks_pending_analysis_not_requested(self):
        report = IncidentReport.objects.create(
            user=User.objects.create_user(username='pending-reporter'),
            incident_type='HAZARD',
            latitude='14.6',
            longitude='121.0',
            analysis_status='PROCESSING',
            analysis_started_at=timezone.now() - timedelta(minutes=2),
        )

        with patch('safety_data.tasks.analyze_incident_image_task.delay') as enqueue:
            recover_stale_incident_image_analysis.run(report.pk)
            count = recover_stale_incident_image_analyses.run()

        enqueue.assert_not_called()
        self.assertEqual(count, 0)
        report.refresh_from_db()
        self.assertEqual(report.analysis_status, 'NOT_REQUESTED')
        self.assertIsNone(report.analysis_started_at)
