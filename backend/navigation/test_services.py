from unittest.mock import MagicMock, patch

import requests
from django.test import TestCase, override_settings

from safety_data.models import IncidentReport
from .services import (
    RoutingConfigurationError,
    RoutingProviderError,
    get_route_preview,
)


class RoutingProviderServiceTests(TestCase):
    origin = {"lat": 14.0, "lng": 121.0}
    destination = {"lat": 14.0, "lng": 121.01}

    @staticmethod
    def route_feature(
        coordinates=None,
        *,
        distance=1234.6,
        duration=901.2,
    ):
        return {
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates or [[121.0, 14.0], [121.01, 14.0]],
            },
            "properties": {
                "summary": {"distance": distance, "duration": duration},
            },
        }

    @staticmethod
    def provider_response(feature):
        response = MagicMock()
        response.json.return_value = {"features": [feature]}
        return response

    @override_settings(OPENROUTESERVICE_API_KEY="test-only-ors-key")
    @patch("navigation.services.requests.post")
    def test_success_normalizes_provider_response_and_request(self, mock_post):
        mock_post.return_value = self.provider_response(self.route_feature())

        result = get_route_preview(self.origin, self.destination)

        self.assertEqual(result["distance_meters"], 1235)
        self.assertEqual(result["duration_seconds"], 901)
        self.assertEqual(result["provider"], "openrouteservice")
        self.assertEqual(result["profile"], "foot-walking")
        self.assertEqual(result["geometry"]["type"], "LineString")
        self.assertEqual(result["route_context"]["signals"], [])
        mock_post.assert_called_once_with(
            "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
            json={"coordinates": [[121.0, 14.0], [121.01, 14.0]]},
            headers={
                "Authorization": "test-only-ors-key",
                "Content-Type": "application/json",
            },
            timeout=10,
        )

    @override_settings(OPENROUTESERVICE_API_KEY="")
    @patch("navigation.services.requests.post")
    def test_missing_api_key_fails_before_external_request(self, mock_post):
        with self.assertRaises(RoutingConfigurationError):
            get_route_preview(self.origin, self.destination)

        mock_post.assert_not_called()

    @override_settings(OPENROUTESERVICE_API_KEY="test-only-ors-key")
    @patch("navigation.services.requests.post")
    def test_approved_nearby_report_adds_coordinate_only_avoidance_reroute(
        self,
        mock_post,
    ):
        private_description = "Private reporter detail that must stay local"
        IncidentReport.objects.create(
            incident_type="INCIDENT",
            description=private_description,
            latitude="14.000000000",
            longitude="121.005000000",
            status="APPROVED",
        )
        # A nearby unreviewed report must not be sent to the routing provider.
        IncidentReport.objects.create(
            incident_type="INCIDENT",
            description="Unreviewed report",
            latitude="14.000000000",
            longitude="121.006000000",
            status="PENDING",
        )
        first_feature = self.route_feature()
        rerouted_feature = self.route_feature(
            [[121.0, 14.01], [121.01, 14.01]],
            distance=1400,
            duration=1000,
        )
        mock_post.side_effect = [
            self.provider_response(first_feature),
            self.provider_response(rerouted_feature),
        ]

        result = get_route_preview(self.origin, self.destination)

        self.assertEqual(mock_post.call_count, 2)
        reroute_payload = mock_post.call_args_list[1].kwargs["json"]
        self.assertEqual(
            reroute_payload["coordinates"],
            [[121.0, 14.0], [121.01, 14.0]],
        )
        polygons = reroute_payload["options"]["avoid_polygons"]
        self.assertEqual(polygons["type"], "MultiPolygon")
        self.assertEqual(len(polygons["coordinates"]), 1)
        self.assertNotIn(private_description, repr(reroute_payload))
        self.assertEqual(result["distance_meters"], 1400)
        self.assertEqual(result["geometry"], rerouted_feature["geometry"])

    @override_settings(OPENROUTESERVICE_API_KEY="test-only-ors-key")
    @patch("navigation.services.requests.post")
    def test_provider_timeout_becomes_controlled_routing_error(self, mock_post):
        mock_post.side_effect = requests.exceptions.Timeout

        with self.assertRaisesMessage(
            RoutingProviderError,
            "Routing provider request timed out.",
        ):
            get_route_preview(self.origin, self.destination)

    @override_settings(OPENROUTESERVICE_API_KEY="test-only-ors-key")
    @patch("navigation.services.requests.post")
    def test_invalid_provider_coordinates_are_rejected(self, mock_post):
        mock_post.return_value = self.provider_response(
            self.route_feature([[181, 14], [121.01, 14]])
        )

        with self.assertRaisesMessage(
            RoutingProviderError,
            "Routing provider returned invalid route geometry.",
        ):
            get_route_preview(self.origin, self.destination)
