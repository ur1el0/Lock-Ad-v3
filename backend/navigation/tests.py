from unittest.mock import patch
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from navigation.services import RoutingConfigurationError, RoutingProviderError
from .models import SavedRoute


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
        
class SavedRouteSecurityTests(APITestCase):
    def setUp(self):
        # 1. Create standard users and a moderator
        self.user_a = User.objects.create_user(username='usera', password='password123')
        self.user_b = User.objects.create_user(username='userb', password='password123')
        self.admin = User.objects.create_superuser(username='admin', password='password123')
        
        # 2. Create a route owned exclusively by User A
        self.route_a = SavedRoute.objects.create(
            user=self.user_a,
            name="Work Commute",
            origin_lat=14.5995, origin_lng=120.9842,
            dest_lat=14.6091, dest_lng=121.0223
        )
        
        # Assuming your router registers this under 'saved-routes'
        self.url = '/api/navigation/saved-routes/'
    
    def test_queryset_isolation_prevents_data_leakage(self):
        """Test ADR-002: Users should only see their own routes."""
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # We check both standard response and paginated response formats
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        
        # User B has no routes, so the list should be strictly empty (0)
        self.assertEqual(len(data), 0) 
        
        self.client.force_authenticate(user=self.user_a)
        response_a = self.client.get(self.url)
        data_a = response_a.data.get('results', response_a.data) if isinstance(response_a.data, dict) else response_a.data
        
        # User A should successfully see their 1 route
        self.assertEqual(len(data_a), 1)

    def test_rbac_prevents_destructive_actions(self):
        """Test ADR-002: Only IsAdminUser can execute DELETE."""
        detail_url = f"{self.url}{self.route_a.id}/"
        
        # User A tries to delete their OWN route
        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(detail_url)
        
        # Blocked by the ViewSet's `IsAdminUser` permission guard
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin attempts the same deletion
        self.client.force_authenticate(user=self.admin)
        admin_response = self.client.delete(detail_url)
        
        # Admin is allowed to delete
        self.assertEqual(admin_response.status_code, status.HTTP_204_NO_CONTENT)