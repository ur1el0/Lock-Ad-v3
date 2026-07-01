from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

# Create your tests here.

class HealthCheckTests(APITestCase):
    def test_health_check_returns_service_status(self):
        response = self.client.get(reverse('health-check'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {
            'status': 'ok',
            'service': 'lock-ad-v3-api',
        })