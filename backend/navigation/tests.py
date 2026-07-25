from unittest.mock import patch
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from navigation.services import RoutingConfigurationError, RoutingProviderError


class RoutePreviewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.url = reverse('route-preview')
        self.valid_payload = {
            "origin": {"lat": 13.9414, "lng": 121.6236},
            "destination": {"lat": 13.9442, "lng": 121.6179},
            "profile": "foot-walking",
        }
    
    def test_unauthenticated_request_blocked(self):
        """Guests should not be allowed to fetch route previews."""
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('navigation.views.get_route_preview')
    def test_successful_route_preview(self, mock_get_route):
        """Valid authenticated requests should yield a normalized route response."""
        self.client.force_login(self.user)
        mock_get_route.return_value = {
            "distance_meters": 1200,
            "duration_seconds": 900,
            "geometry": {"type": "LineString", "coordinates": []},
            "provider": "openrouteservice",
            "profile": "foot-walking",
        }

        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['distance_meters'], 1200)
        self.assertEqual(response.data['provider'], 'openrouteservice')

    def test_identical_coordinates_fails(self):
        """Providing identical origin and destination coordinates should fail validation."""
        self.client.force_login(self.user)
        payload = {
            "origin": {"lat": 13.9414, "lng": 121.6236},
            "destination": {"lat": 13.9414, "lng": 121.6236},
            "profile": "foot-walking"
        }
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('navigation.views.get_route_preview')
    def test_missing_api_key_returns_503(self, mock_get_route):
        """If the service layer has no api key configured, view should return 503"""
        self.client.force_login(self.user)
        mock_get_route.side_effect = RoutingConfigurationError("OpenRouteService API key is  not configured")
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @patch('navigation.views.get_route_preview')
    def test_provider_error_returns_502(self, mock_get_route):
        """If the provider API fails, view should return a 502 Bad Gateway."""
        self.client.force_login(self.user)
        mock_get_route.side_effect = RoutingProviderError("Routing provider error: connection failed")
        response = self.client.post(self.url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        
        
        
