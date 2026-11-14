from decimal import Decimal
from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

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
        self.assertEqual(report.status, 'PENDING')
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
        self.assertEqual(IncidentReport.objects.first().analysis_status, 'NOT_REQUESTED')

    def test_uncomputed_incident_confidence_is_not_exposed_by_the_api(self):
        report = IncidentReport.objects.create(
            user=self.user,
            incident_type='HAZARD',
            latitude='14.6',
            longitude='121.0',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse('incident-detail', args=[report.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('confidence_score', response.data)

    @override_settings(
        GEMINI_API_ENABLED=True,
        GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=True,
    )
    def test_photo_report_is_queued_after_commit(self):
        image_bytes = BytesIO()
        Image.new('RGB', (2, 2), color='red').save(image_bytes, format='PNG')
        upload = SimpleUploadedFile(
            'evidence.png',
            image_bytes.getvalue(),
            content_type='image/png',
        )
        self.client.force_authenticate(user=self.user)
        payload = {
            'incident_type': 'HAZARD',
            'description': 'A damaged sidewalk',
            'latitude': '14.6',
            'longitude': '121.0',
            'image': upload,
        }

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                with patch('safety_data.views.analyze_incident_image_task.delay') as enqueue:
                    with self.captureOnCommitCallbacks(execute=True):
                        response = self.client.post(
                            reverse('incident-list'),
                            payload,
                            format='multipart',
                        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = IncidentReport.objects.get()
        self.assertEqual(report.analysis_status, 'PENDING')
        enqueue.assert_called_once_with(report.pk)
        self.assertNotIn('analysis_status', response.data)

    @override_settings(
        GEMINI_API_ENABLED=True,
        GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=True,
    )
    def test_photo_report_is_kept_for_manual_review_if_queue_is_unavailable(self):
        image_bytes = BytesIO()
        Image.new('RGB', (2, 2), color='red').save(image_bytes, format='PNG')
        upload = SimpleUploadedFile(
            'evidence.png',
            image_bytes.getvalue(),
            content_type='image/png',
        )
        self.client.force_authenticate(user=self.user)
        payload = {
            'incident_type': 'HAZARD',
            'latitude': '14.6',
            'longitude': '121.0',
            'image': upload,
        }

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                with patch(
                    'safety_data.views.analyze_incident_image_task.delay',
                    side_effect=ConnectionError('Redis unavailable'),
                ):
                    with self.captureOnCommitCallbacks(execute=True):
                        response = self.client.post(
                            reverse('incident-list'),
                            payload,
                            format='multipart',
                        )

        report = IncidentReport.objects.get()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(report.analysis_status, 'FAILED')
        self.assertIn('Manual review required', report.ai_analysis)

    @override_settings(GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=False)
    def test_photo_report_is_not_sent_to_gemini_when_analysis_is_disabled(self):
        image_bytes = BytesIO()
        Image.new('RGB', (2, 2), color='yellow').save(image_bytes, format='PNG')
        upload = SimpleUploadedFile(
            'evidence.png',
            image_bytes.getvalue(),
            content_type='image/png',
        )
        self.client.force_authenticate(user=self.user)
        payload = {
            'incident_type': 'HAZARD',
            'description': 'A damaged sidewalk',
            'latitude': '14.6',
            'longitude': '121.0',
            'image': upload,
        }

        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                with patch(
                    'safety_data.views.analyze_incident_image_task.delay'
                ) as enqueue:
                    with self.captureOnCommitCallbacks(execute=True):
                        response = self.client.post(
                            reverse('incident-list'),
                            payload,
                            format='multipart',
                        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = IncidentReport.objects.get()
        self.assertEqual(report.analysis_status, 'NOT_REQUESTED')
        enqueue.assert_not_called()

    def test_bounding_box_filtering(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('signal-list')
        # Bounding box containing the signal (14.5995, 120.9842)
        response = self.client.get(url, {
            'min_lat': '14.0', 'max_lat': '15.0',
            'min_lng': '120.0', 'max_lng': '121.0'
        })
        self.assertEqual(len(response.data['results']), 1)

        # Bounding box NOT containing the signal
        response_empty = self.client.get(url, {
            'min_lat': '15.0', 'max_lat': '16.0',
            'min_lng': '120.0', 'max_lng': '121.0'
        })
        self.assertEqual(len(response_empty.data['results']), 0)

    def test_bounding_box_is_optional_when_no_bounds_are_provided(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse('signal-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_bounding_box_requires_all_coordinates_for_signals_and_incidents(self):
        self.client.force_authenticate(user=self.user)

        for url_name in ('signal-list', 'incident-list'):
            with self.subTest(endpoint=url_name):
                response = self.client.get(reverse(url_name), {
                    'min_lat': '14.0',
                })

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bounding_box_rejects_out_of_range_coordinates_for_both_endpoints(self):
        self.client.force_authenticate(user=self.user)
        params = {
            'min_lat': '-91',
            'max_lat': '90',
            'min_lng': '-180',
            'max_lng': '180',
        }

        for url_name in ('signal-list', 'incident-list'):
            with self.subTest(endpoint=url_name):
                response = self.client.get(reverse(url_name), params)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('min_lat', response.data)

    def test_bounding_box_rejects_nonnumeric_coordinates_for_both_endpoints(self):
        self.client.force_authenticate(user=self.user)
        params = {
            'min_lat': '14north',
            'max_lat': '15',
            'min_lng': '120',
            'max_lng': '121',
        }

        for url_name in ('signal-list', 'incident-list'):
            with self.subTest(endpoint=url_name):
                response = self.client.get(reverse(url_name), params)

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('min_lat', response.data)

    def test_bounding_box_rejects_reversed_ranges_for_both_endpoints(self):
        self.client.force_authenticate(user=self.user)
        invalid_ranges = (
            ({
                'min_lat': '15',
                'max_lat': '14',
                'min_lng': '120',
                'max_lng': '121',
            }, 'max_lat'),
            ({
                'min_lat': '14',
                'max_lat': '15',
                'min_lng': '121',
                'max_lng': '120',
            }, 'max_lng'),
        )

        for url_name in ('signal-list', 'incident-list'):
            for params, error_field in invalid_ranges:
                with self.subTest(endpoint=url_name, range=error_field):
                    response = self.client.get(reverse(url_name), params)

                    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                    self.assertIn(error_field, response.data)
