import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from safety_data.models import IncidentImageDeletion, IncidentReport

logger = logging.getLogger(__name__)


def schedule_pending_image_deletions():
    try:
        from safety_data.tasks import process_pending_incident_image_deletions

        process_pending_incident_image_deletions.delay()
    except Exception as error:
        logger.warning(
            'Incident image cleanup could not be queued (%s).',
            type(error).__name__,
        )


@receiver(post_delete, sender=IncidentReport)
def delete_incident_image(sender, instance, **kwargs):
    if not instance.image:
        return

    image_name = instance.image.name
    IncidentImageDeletion.objects.get_or_create(image_name=image_name)
    transaction.on_commit(
        schedule_pending_image_deletions,
        robust=True,
    )


@receiver(post_save, sender=IncidentReport)
def broadcast_approved_incidents(sender, instance, **kwargs):
    if (
        instance.status != 'APPROVED'
        or getattr(instance, '_previous_status', None) == 'APPROVED'
        or getattr(instance, '_previous_status', None) is None
    ):
        return

    message = {
        'id': instance.pk,
        'incident_type': instance.incident_type,
        'status': instance.status,
        'latitude': str(instance.latitude),
        'longitude': str(instance.longitude),
        'reported_at': instance.reported_at.isoformat(),
    }

    def publish_after_commit():
        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                return
            async_to_sync(channel_layer.group_send)(
                'incidents',
                {
                    'type': 'incident_update',
                    'message': message,
                },
            )
        except Exception as error:
            logger.warning(
                'Approved incident broadcast failed (%s).',
                type(error).__name__,
            )

    transaction.on_commit(publish_after_commit, robust=True)
