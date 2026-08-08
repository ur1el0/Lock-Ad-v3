from rest_framework import status
from django.test import TestCase
from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from safety_data.models import IncidentReport, SafetySignal
from rest_framework.test import APIClient
from django.urls import reverse

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

class SafetyAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='password123')
        
        # A signal in Manila
        self.signal = SafetySignal.objects.create(
            signal_type='LIGHT',
            source='OSM',
            name='Test Light',
            latitude='14.5995',
            longitude='120.9842'
        )

    def test_unauthenticated_cannot_create_incident(self):
        url = reverse('incident-list')
        data = {'incident_type': 'HAZARD', 'latitude': '14.6', 'longitude': '121.0'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_can_create_incident(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('incident-list')
        data = {'incident_type': 'HAZARD', 'latitude': '14.6', 'longitude': '121.0'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(IncidentReport.objects.first().user, self.user)

    def test_bounding_box_filtering(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('signal-list')
        # Bounding box containing the signal (14.5995, 120.9842)
        response = self.client.get(url, {
            'min_lat': '14.0', 'max_lat': '15.0',
            'min_lng': '120.0', 'max_lng': '121.0'
        })
        self.assertEqual(len(response.data), 1)

        # Bounding box NOT containing the signal
        response_empty = self.client.get(url, {
            'min_lat': '15.0', 'max_lat': '16.0',
            'min_lng': '120.0', 'max_lng': '121.0'
        })
        self.assertEqual(len(response_empty.data), 0)