from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from safety_data.models import IncidentReport


class AiPrivacyTests(TestCase):
    def setUp(self):
        self.media_directory = TemporaryDirectory()
        self.settings_override = override_settings(
            MEDIA_ROOT=self.media_directory.name,
            GEMINI_API_ENABLED=False,
            GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=False,
        )
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.addCleanup(self.media_directory.cleanup)

        self.reporter = User.objects.create_user(
            username='reporter', password='test-password-123'
        )
        self.reader = User.objects.create_user(
            username='reader', password='test-password-123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.reporter)

    @staticmethod
    def png_upload():
        image_data = BytesIO()
        Image.new('RGB', (2, 2), color='red').save(image_data, format='PNG')
        return image_data.getvalue()

    @patch('safety_data.views.analyze_incident_image_task.delay')
    def test_image_upload_is_stored_without_queueing_analysis_when_disabled(self, enqueue):
        from django.core.files.uploadedfile import SimpleUploadedFile

        upload = SimpleUploadedFile(
            'evidence.png', self.png_upload(), content_type='image/png'
        )
        response = self.client.post(
            reverse('incident-list'),
            {
                'incident_type': 'HAZARD',
                'description': 'Loose paving near the crossing.',
                'latitude': '14.599500000',
                'longitude': '120.984200000',
                'image': upload,
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 201, response.data)
        enqueue.assert_not_called()
        report = IncidentReport.objects.get()
        self.assertTrue(report.image)
        self.assertFalse(report.ai_analysis)

    @patch('safety_data.ai_service.genai.Client')
    def test_advisory_uses_local_fallback_without_gemini_when_disabled(self, client):
        response = self.client.post(
            reverse('generate_advisory'),
            {
                'distance': 1200,
                'duration': 900,
                'weather_code': 1,
                'temperature': 30,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('trip may take about 15 minutes', response.data['advisory'])
        client.assert_not_called()

    def test_approved_reports_are_visible_to_other_signed_in_users(self):
        approved = IncidentReport.objects.create(
            user=self.reporter,
            incident_type='HAZARD',
            description='Uneven pavement by the crossing.',
            latitude='14.599500000',
            longitude='120.984200000',
            status='APPROVED',
        )
        pending = IncidentReport.objects.create(
            user=self.reporter,
            incident_type='LIGHTING',
            description='Pending light report.',
            latitude='14.600000000',
            longitude='120.985000000',
            status='PENDING',
        )
        self.client.force_authenticate(user=self.reader)

        response = self.client.get(reverse('incident-list'))

        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        visible_ids = {item['id'] for item in results}
        self.assertIn(approved.id, visible_ids)
        self.assertNotIn(pending.id, visible_ids)
        approved_data = next(item for item in results if item['id'] == approved.id)
        self.assertEqual(approved_data['description'], approved.description)
        self.assertEqual(approved_data['latitude'], '14.599500000')
        self.assertNotIn('ai_analysis', approved_data)

    def test_debug_mode_does_not_expose_media_through_public_static_route(self):
        response = self.client.get('/media/not-a-public-file.png')

        self.assertEqual(response.status_code, 404)

    def test_sensitive_api_throttle_scopes_have_configured_limits(self):
        rates = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']

        self.assertEqual(rates['incident_image_upload'], '10/day')
        self.assertEqual(rates['gemini_advisory_anon'], '20/hour')
        self.assertEqual(rates['gemini_advisory_user'], '100/day')
