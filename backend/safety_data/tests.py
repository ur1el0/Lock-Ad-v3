from django.test import TestCase
from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from safety_data.models import IncidentReport, SafetySignal

# Create your tests here.

class SafetyModelTests(TestCase):
    def setUp(self):
        # Create a user to associate with tests
        self.user = User.objects.create_user(
            username='testuser',
            password='password123'
        )

    def test_incident_report_creation(self):
        report = IncidentReport.objects.create(
            user=self.user,
            latitude=Decimal('13.938100000'),
            longitude=Decimal('121.611700000'),
        )
        self.assertEqual(report.user, self.user)
        self.assertEqual(report.status, 'APPROVED')
        self.assertEqual(report.confidence_score, 1)
        self.assertLessEqual(report.reported_at, timezone.now())
        self.assertLessEqual(report.occurred_at, timezone.now())
    
    def test_safety_incident_report(self):
        report = IncidentReport.objects.create(
            user=None,
            latitude=Decimal('13.938100000'),
            longitude=Decimal('121.611700000'),
        )
        self.assertEqual(report.user, None)
        
    def test_safety_signal_creation(self):
        signal = SafetySignal.objects.create(
            source='OSM',
            signal_type='LIGHT',
            latitude=Decimal('13.938100000'),
            longitude=Decimal('121.611700000'),
            tags={
                "lit": "yes",
                "height": "8m"
            }
        )
        self.assertEqual(signal.source, 'OSM')
        self.assertEqual(signal.signal_type, 'LIGHT')
        self.assertEqual(signal.latitude, Decimal('13.938100000'))
        self.assertEqual(signal.longitude, Decimal('121.611700000'))
        self.assertEqual(signal.tags, {"lit": "yes", "height": "8m"})
