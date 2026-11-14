import logging
from datetime import timedelta

from celery import shared_task
from celery.exceptions import Retry
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from safety_data.ai_service import (
    IncidentImageAnalysisError,
    analyze_incident_image,
)
from safety_data.models import (
    IncidentImageDeletion,
    IncidentReport,
    TERMINAL_REPORT_STATUSES,
)


logger = logging.getLogger(__name__)
MANUAL_REVIEW_MESSAGE = (
    'Automated vision analysis unavailable. Manual review required.'
)
PROCESSING_LEASE = timedelta(seconds=90)


def _set_analysis_state(
    report_id,
    status,
    *,
    analysis=None,
    expected_status=None,
):
    updates = {
        'analysis_status': status,
        'analysis_started_at': None,
    }
    if analysis is not None:
        updates['ai_analysis'] = analysis
    reports = IncidentReport.objects.filter(pk=report_id)
    if expected_status is not None:
        reports = reports.filter(analysis_status=expected_status)
    return reports.update(**updates)


def _retry_analysis_or_mark_for_manual_review(task, report_id, countdown):
    _set_analysis_state(report_id, 'PENDING')
    try:
        raise task.retry(
            exc=IncidentImageAnalysisError('Incident image analysis will retry.'),
            countdown=countdown,
        )
    except Retry:
        raise
    except Exception as error:
        logger.warning(
            'Incident image analysis retry could not be queued (%s).',
            type(error).__name__,
        )
        _set_analysis_state(
            report_id,
            'FAILED',
            analysis=MANUAL_REVIEW_MESSAGE,
        )


@shared_task(ignore_result=True)
def recover_stale_incident_image_analysis(report_id):
    """Requeue image analysis if its worker stopped before persisting a result."""
    if (
        not settings.GEMINI_API_ENABLED
        or not settings.GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED
    ):
        IncidentReport.objects.filter(
            pk=report_id,
            analysis_status__in=['PENDING', 'PROCESSING'],
        ).update(analysis_status='NOT_REQUESTED', analysis_started_at=None)
        return

    try:
        with transaction.atomic():
            report = IncidentReport.objects.select_for_update().get(pk=report_id)
            if report.analysis_status != 'PROCESSING':
                return
            if (
                report.analysis_started_at is not None
                and report.analysis_started_at > timezone.now() - PROCESSING_LEASE
            ):
                return

            report.analysis_status = 'PENDING'
            report.analysis_started_at = None
            report.save(update_fields=['analysis_status', 'analysis_started_at'])
    except IncidentReport.DoesNotExist:
        return

    try:
        analyze_incident_image_task.delay(report_id)
    except Exception as error:
        logger.warning(
            'Stale incident image analysis could not be requeued (%s).',
            type(error).__name__,
        )
        _set_analysis_state(
            report_id,
            'FAILED',
            analysis=MANUAL_REVIEW_MESSAGE,
            expected_status='PENDING',
        )


@shared_task(ignore_result=True)
def recover_stale_incident_image_analyses():
    """Queue bounded recovery checks for reports left processing by a lost worker."""
    if (
        not settings.GEMINI_API_ENABLED
        or not settings.GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED
    ):
        IncidentReport.objects.filter(
            analysis_status__in=['PENDING', 'PROCESSING'],
        ).update(analysis_status='NOT_REQUESTED', analysis_started_at=None)
        return 0

    stale_before = timezone.now() - PROCESSING_LEASE
    stale_report_ids = (
        IncidentReport.objects.filter(analysis_status='PROCESSING')
        .filter(
            Q(analysis_started_at__isnull=True)
            | Q(analysis_started_at__lte=stale_before)
        )
        .order_by(F('analysis_started_at').asc(nulls_first=True), 'pk')
        .values_list('pk', flat=True)[:100]
    )

    for report_id in stale_report_ids:
        try:
            recover_stale_incident_image_analysis.delay(report_id)
        except Exception as error:
            logger.warning(
                'Stale incident analysis recovery could not be queued (%s).',
                type(error).__name__,
            )


@shared_task(bind=True, acks_late=True, max_retries=3)
def analyze_incident_image_task(self, report_id):
    """Analyze a report photo outside the request and retry transient failures."""
    if (
        not settings.GEMINI_API_ENABLED
        or not settings.GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED
    ):
        IncidentReport.objects.filter(
            pk=report_id,
            analysis_status__in=['PENDING', 'PROCESSING'],
        ).update(analysis_status='NOT_REQUESTED', analysis_started_at=None)
        return

    try:
        with transaction.atomic():
            report = IncidentReport.objects.select_for_update().get(pk=report_id)
            if report.analysis_status in {'NOT_REQUESTED', 'COMPLETED', 'FAILED'}:
                return

            now = timezone.now()
            if (
                report.analysis_status == 'PROCESSING'
                and report.analysis_started_at is not None
                and report.analysis_started_at > now - PROCESSING_LEASE
            ):
                # Another delivery is already working. A killed worker's
                # delivery can reclaim the row after its lease expires.
                return

            if not report.image:
                _set_analysis_state(
                    report.pk,
                    'FAILED',
                    analysis=MANUAL_REVIEW_MESSAGE,
                )
                return

            report.analysis_status = 'PROCESSING'
            report.analysis_started_at = now
            report.save(update_fields=['analysis_status', 'analysis_started_at'])
    except IncidentReport.DoesNotExist:
        return

    try:
        recover_stale_incident_image_analysis.apply_async(
            args=[report_id],
            countdown=PROCESSING_LEASE.total_seconds() + 1,
        )
    except Exception as error:
        logger.warning(
            'Incident image recovery check could not be queued (%s).',
            type(error).__name__,
        )

    try:
        with report.image.open('rb') as image_file:
            analysis = analyze_incident_image(
                image_file,
                report.incident_type,
                report.description or '',
            )
    except IncidentImageAnalysisError as error:
        if error.retryable and self.request.retries < self.max_retries:
            return _retry_analysis_or_mark_for_manual_review(
                self,
                report.pk,
                60 * (2 ** self.request.retries),
            )

        logger.warning(
            'Incident image analysis exhausted or unavailable (%s).',
            type(error).__name__,
        )
        _set_analysis_state(
            report.pk,
            'FAILED',
            analysis=MANUAL_REVIEW_MESSAGE,
        )
        return
    except Exception as error:
        if self.request.retries < self.max_retries:
            return _retry_analysis_or_mark_for_manual_review(
                self,
                report.pk,
                60 * (2 ** self.request.retries),
            )

        logger.warning(
            'Incident image processing exhausted retries (%s).',
            type(error).__name__,
        )
        _set_analysis_state(
            report.pk,
            'FAILED',
            analysis=MANUAL_REVIEW_MESSAGE,
        )
        return

    _set_analysis_state(
        report.pk,
        'COMPLETED',
        analysis=analysis,
    )


@shared_task(ignore_result=True)
def process_pending_incident_image_deletions():
    """Delete queued evidence files and retain failed jobs for the next sweep."""
    deletion_ids = IncidentImageDeletion.objects.order_by(
        'created_at', 'pk'
    ).values_list('pk', flat=True)[:100]
    deleted_count = 0

    for deletion_id in deletion_ids:
        try:
            with transaction.atomic():
                deletion = IncidentImageDeletion.objects.select_for_update().filter(
                    pk=deletion_id
                ).first()
                if deletion is None:
                    continue

                if IncidentReport.objects.filter(image=deletion.image_name).exists():
                    deletion.delete()
                    continue

                try:
                    if default_storage.exists(deletion.image_name):
                        default_storage.delete(deletion.image_name)
                except Exception as error:
                    IncidentImageDeletion.objects.filter(pk=deletion.pk).update(
                        attempts=F('attempts') + 1,
                        last_error=type(error).__name__,
                    )
                    logger.warning(
                        'Incident image deletion failed (%s).',
                        type(error).__name__,
                    )
                    continue

                deletion.delete()
                deleted_count += 1
        except Exception as error:
            logger.warning(
                'Incident image deletion job could not be completed (%s).',
                type(error).__name__,
            )

    if deleted_count:
        logger.info('Completed %d queued incident photo deletions.', deleted_count)
    return deleted_count


def _queue_pending_image_deletions():
    try:
        process_pending_incident_image_deletions.delay()
    except Exception as error:
        logger.warning(
            'Pending incident image deletions could not be queued (%s).',
            type(error).__name__,
        )


@shared_task(ignore_result=True)
def purge_expired_incident_images():
    """Remove old photos from closed reports while preserving report records."""
    retention_days = settings.INCIDENT_IMAGE_RETENTION_DAYS
    if retention_days is None:
        return 0

    cutoff = timezone.now() - timedelta(days=retention_days)
    eligible = IncidentReport.objects.filter(
        closed_at__lt=cutoff,
        status__in=TERMINAL_REPORT_STATUSES,
        analysis_status__in={'NOT_REQUESTED', 'COMPLETED', 'FAILED'},
        image__isnull=False,
    ).exclude(image='')
    detached_count = 0

    for report_id in eligible.values_list('pk', flat=True).iterator(chunk_size=200):
        try:
            with transaction.atomic():
                report = IncidentReport.objects.select_for_update().filter(
                    pk=report_id,
                    closed_at__lt=cutoff,
                    status__in=TERMINAL_REPORT_STATUSES,
                    analysis_status__in={'NOT_REQUESTED', 'COMPLETED', 'FAILED'},
                    image__isnull=False,
                ).exclude(image='').first()
                if report is None:
                    continue

                image_name = report.image.name
                report.image = None
                report.save(update_fields=['image'])
                IncidentImageDeletion.objects.get_or_create(image_name=image_name)
            detached_count += 1
        except Exception as error:
            logger.warning(
                'Expired incident photo could not be detached (%s).',
                type(error).__name__,
            )

    if detached_count:
        logger.info(
            'Queued %d expired incident photos for deletion.',
            detached_count,
        )
        _queue_pending_image_deletions()
    return detached_count
