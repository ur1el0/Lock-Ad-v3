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
    latitude = models.DecimalField(max_digits=12, decimal_places=9)
    longitude = models.DecimalField(max_digits=12, decimal_places=9)
    status = models.CharField(max_length=20, choices=REPORT_STATUS, default='APPROVED')
    confidence_score = models.IntegerField(default=1)


class SafetySignal(models.Model):
    source = models.CharField(choices=SIGNAL_SOURCES)
    signal_type = models.CharField(choices=SIGNAL_TYPES)
    name = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=12, decimal_places=9)
    longitude = models.DecimalField(max_digits=12, decimal_places=9)
    tags = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)