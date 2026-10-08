import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from safety_data.models import IncidentReport

logger = logging.getLogger(__name__)


def remove_stored_image(storage, image_name):
    try:
        storage.delete(image_name)
    except Exception as error:
        logger.warning(
            'Incident image cleanup failed (%s).',
            type(error).__name__,
        )


@receiver(post_delete, sender=IncidentReport)
def delete_incident_image(sender, instance, **kwargs):
    if not instance.image:
        return

    storage = instance.image.storage
    image_name = instance.image.name
    transaction.on_commit(lambda: remove_stored_image(storage, image_name))


@receiver(pre_save, sender=IncidentReport)
def remember_previous_status(sender, instance, **kwargs):
    if instance._state.adding:
        instance._previous_status = None
        return

    instance._previous_status = (
        sender.objects.filter(pk=instance.pk)
        .values_list('status', flat=True)
        .first()
    )


@receiver(post_save, sender=IncidentReport)
def broadcast_approved_incidents(sender, instance, **kwargs):
    if (
        instance.status != 'APPROVED'
        or getattr(instance, '_previous_status', None) == 'APPROVED'
        or getattr(instance, '_previous_status', None) is None
    ):
        return

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    message = {
        'id': instance.pk,
        'incident_type': instance.incident_type,
        'status': instance.status,
        'latitude': str(instance.latitude),
        'longitude': str(instance.longitude),
        'reported_at': instance.reported_at.isoformat(),
    }
    async_to_sync(channel_layer.group_send)(
        'incidents',
        {
            'type': 'incident_update',
            'message': message,
        },
    )
