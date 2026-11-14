from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

# Create your models here.

INCIDENT_TYPES = [
    ('LIGHTING', 'Lighting Issue'),
    ('HAZARD', 'Road/Obstuction Hazard'),
    ('INCIDENT', 'Security Incident'),
    ('ACCIDENT', 'Traffic Accident'),
]

REPORT_STATUS = [
    ('PENDING', 'Pending Review'),
    ('APPROVED', 'Approved'),
    ('RESOLVED', 'Resolved'),
    ('SPAM', 'Spam'),
]
TERMINAL_REPORT_STATUSES = {'APPROVED', 'RESOLVED', 'SPAM'}

ANALYSIS_STATUS = [
    ('NOT_REQUESTED', 'Not requested'),
    ('PENDING', 'Pending'),
    ('PROCESSING', 'Processing'),
    ('COMPLETED', 'Completed'),
    ('FAILED', 'Unavailable'),
]

SIGNAL_SOURCES = [
    ('OSM', 'OpenStreetMap'),
    ('LGU', 'Local Government Unit'),
    ('PSA', 'Philippine Statistics Authority'),
]

SIGNAL_TYPES = [
    ('CCTV', 'CCTV Camera'),
    ('LIGHT', 'Street Light'),
    ('POLICE', 'Police Station'),
    ('MEDICAL', 'Medical Center'),
]


class IncidentReport(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPES)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='incident_images/', null=True, blank=True)
    ai_analysis = models.TextField(blank=True, null=True)
    analysis_status = models.CharField(
        max_length=20,
        choices=ANALYSIS_STATUS,
        default='NOT_REQUESTED',
    )
    analysis_started_at = models.DateTimeField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=12, decimal_places=9, db_index=True)
    longitude = models.DecimalField(max_digits=12, decimal_places=9, db_index=True)
    status = models.CharField(max_length=20, choices=REPORT_STATUS, default='PENDING', db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True, db_index=True)
    # Legacy placeholder retained for existing rows; no calibrated value is produced.
    confidence_score = models.IntegerField(default=1)
    reported_at = models.DateTimeField(auto_now_add=True, db_index=True)
    occurred_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get('update_fields')
        tracks_status = (
            self._state.adding
            or update_fields is None
            or 'status' in update_fields
        )
        if tracks_status:
            if self._state.adding:
                self._previous_status = None
                if self.status in TERMINAL_REPORT_STATUSES and self.closed_at is None:
                    self.closed_at = timezone.now()
            else:
                previous_status = type(self).objects.filter(pk=self.pk).values_list(
                    'status', flat=True
                ).first()
                self._previous_status = previous_status
                if previous_status is not None and previous_status != self.status:
                    self.closed_at = (
                        timezone.now()
                        if self.status in TERMINAL_REPORT_STATUSES
                        else None
                    )
                    if update_fields is not None:
                        kwargs['update_fields'] = set(update_fields) | {'closed_at'}
        else:
            self._previous_status = self.status

        super().save(*args, **kwargs)


class SafetySignal(models.Model):
    source = models.CharField(max_length=20, choices=SIGNAL_SOURCES)
    signal_type = models.CharField(max_length=20, choices=SIGNAL_TYPES)
    name = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=12, decimal_places=9, db_index=True)
    longitude = models.DecimalField(max_digits=12, decimal_places=9, db_index=True)
    tags = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class IncidentImageDeletion(models.Model):
    """Durable retry record for deleting evidence files from media storage."""

    image_name = models.CharField(max_length=512, unique=True)
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
