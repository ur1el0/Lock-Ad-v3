from datetime import timedelta
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image

from safety_data.models import IncidentImageDeletion, IncidentReport
from safety_data.tasks import (
    process_pending_incident_image_deletions,
    purge_expired_incident_images,
)


class IncidentImageRetentionTests(TestCase):
    def setUp(self):
        self.media_directory = TemporaryDirectory()
        self.media_override = override_settings(MEDIA_ROOT=self.media_directory.name)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(self.media_directory.cleanup)
        self.user = User.objects.create_user(username='retention-reporter')

    @staticmethod
    def png_upload():
        image_data = BytesIO()
        Image.new('RGB', (2, 2), color='blue').save(image_data, format='PNG')
        return SimpleUploadedFile(
            'evidence.png', image_data.getvalue(), content_type='image/png'
        )

    def create_report(self, *, status='PENDING', analysis_status='COMPLETED'):
        return IncidentReport.objects.create(
            user=self.user,
            incident_type='HAZARD',
            latitude='14.600000000',
            longitude='121.000000000',
            status=status,
            analysis_status=analysis_status,
            image=self.png_upload(),
        )

    def test_terminal_status_sets_closed_at_and_reopening_clears_it(self):
        report = self.create_report()

        report.status = 'APPROVED'
        report.save(update_fields=['status'])
        report.refresh_from_db()
        self.assertIsNotNone(report.closed_at)

        report.status = 'PENDING'
        report.save(update_fields=['status'])
        report.refresh_from_db()
        self.assertIsNone(report.closed_at)

    def test_report_deletion_queues_photo_cleanup_after_commit(self):
        report = self.create_report()
        image_name = report.image.name

        with patch(
            'safety_data.tasks.process_pending_incident_image_deletions.delay'
        ) as enqueue:
            with self.captureOnCommitCallbacks(execute=True):
                report.delete()

        self.assertTrue(
            IncidentImageDeletion.objects.filter(image_name=image_name).exists()
        )
        enqueue.assert_called_once_with()

    @override_settings(INCIDENT_IMAGE_RETENTION_DAYS=30)
    def test_expired_closed_report_queues_photo_deletion_but_keeps_report(self):
        report = self.create_report(status='APPROVED')
        old_closed_at = timezone.now() - timedelta(days=31)
        IncidentReport.objects.filter(pk=report.pk).update(closed_at=old_closed_at)
        image_name = report.image.name

        with patch(
            'safety_data.tasks.process_pending_incident_image_deletions.delay'
        ) as enqueue:
            deleted_count = purge_expired_incident_images.run()

        self.assertEqual(deleted_count, 1)
        report.refresh_from_db()
        self.assertFalse(report.image)
        self.assertTrue(IncidentReport.objects.filter(pk=report.pk).exists())
        self.assertTrue(
            IncidentImageDeletion.objects.filter(image_name=image_name).exists()
        )
        enqueue.assert_called_once_with()

    @override_settings(INCIDENT_IMAGE_RETENTION_DAYS=30)
    def test_expired_report_with_analysis_in_progress_keeps_its_photo(self):
        report = self.create_report(
            status='APPROVED', analysis_status='PROCESSING'
        )
        IncidentReport.objects.filter(pk=report.pk).update(
            closed_at=timezone.now() - timedelta(days=31)
        )

        self.assertEqual(purge_expired_incident_images.run(), 0)

        report.refresh_from_db()
        self.assertTrue(report.image)
        self.assertFalse(IncidentImageDeletion.objects.exists())

    def test_deletion_worker_removes_unreferenced_file_and_queue_row(self):
        report = self.create_report()
        image_name = report.image.name
        image_path = report.image.path
        report.image = None
        report.save(update_fields=['image'])
        deletion = IncidentImageDeletion.objects.create(image_name=image_name)

        deleted_count = process_pending_incident_image_deletions.run()

        self.assertEqual(deleted_count, 1)
        self.assertFalse(Path(image_path).exists())
        self.assertFalse(IncidentImageDeletion.objects.filter(pk=deletion.pk).exists())

    def test_deletion_worker_keeps_failed_jobs_for_retry(self):
        report = self.create_report()
        image_name = report.image.name
        report.image = None
        report.save(update_fields=['image'])
        deletion = IncidentImageDeletion.objects.create(image_name=image_name)

        with patch(
            'safety_data.tasks.default_storage.delete',
            side_effect=OSError('Storage is temporarily unavailable.'),
        ):
            self.assertEqual(process_pending_incident_image_deletions.run(), 0)

        deletion.refresh_from_db()
        self.assertEqual(deletion.attempts, 1)
        self.assertEqual(deletion.last_error, 'OSError')
