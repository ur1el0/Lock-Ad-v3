from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from safety_data.models import IncidentReport
from safety_data.serializers import IncidentReportSerializer

@receiver(post_save, sender=IncidentReport)
def broadcast_incidents(sender, instance, created, **kwargs):
    # Only broadcast if the incident is approved
    if instance.status == 'APPROVED':
        channel_layer = get_channel_layer()
        serializer = IncidentReportSerializer(instance)

        async_to_sync(channel_layer.group_send)(
            'incidents',
            {
                'type': 'incident_update',
                'message': serializer.data
            }
        )