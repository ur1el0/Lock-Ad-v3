import logging
import math

import requests
from django.conf import settings

from safety_data.models import IncidentReport
from .scoring import (
    INCIDENT_ROUTE_DISTANCE_METERS,
    calculate_route_score,
    is_point_near_route,
    route_bounding_box,
)

logger = logging.getLogger(__name__)
INCIDENT_AVOIDANCE_BUFFER_DEGREES = 0.0001


class RoutingConfigurationError(Exception):
    """Raised when the routing key is not configured in Django settings."""


class RoutingProviderError(Exception):
    """Raised when the external routing API fails or returns invalid data."""


def get_openrouteservice_api_key():
    api_key = getattr(settings, "OPENROUTESERVICE_API_KEY", "")
    if not api_key:
        raise RoutingConfigurationError("OpenRouteService API key is not configured.")
    return api_key


def _request_route(url, headers, payload, *, avoiding_reports=False):
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.Timeout:
        raise RoutingProviderError("Routing provider request timed out.") from None
    except requests.exceptions.RequestException as error:
        provider_response = getattr(error, "response", None)
        if getattr(provider_response, "status_code", None) == 404:
            if avoiding_reports:
                message = "No route was found that avoids nearby approved incident reports."
            else:
                message = "No route was found for the selected points."
            raise RoutingProviderError(message) from None
        logger.warning("Routing provider request failed (%s).", type(error).__name__)
        raise RoutingProviderError("Routing provider request failed.") from None
    except ValueError:
        logger.warning("Routing provider returned invalid JSON.")
        raise RoutingProviderError("Routing provider returned an invalid response.") from None

    features = data.get("features") if isinstance(data, dict) else None
    if not isinstance(features, list) or not features:
        raise RoutingProviderError("Routing provider returned no route.")

    feature = features[0]
    geometry = feature.get("geometry") if isinstance(feature, dict) else None
    coordinates = geometry.get("coordinates") if isinstance(geometry, dict) else None
    if not isinstance(coordinates, list) or not coordinates:
        raise RoutingProviderError("Routing provider returned invalid route geometry.")

    try:
        if any(
            not isinstance(point, (list, tuple))
            or len(point) < 2
            or not all(math.isfinite(float(value)) for value in point[:2])
            or not -180 <= float(point[0]) <= 180
            or not -90 <= float(point[1]) <= 90
            for point in coordinates
        ):
            raise ValueError
    except (TypeError, ValueError):
        raise RoutingProviderError("Routing provider returned invalid route geometry.") from None

    return feature


def _approved_incidents_near_route(geometry):
    coordinates = geometry.get("coordinates", [])
    bounds = route_bounding_box(coordinates)
    if bounds is None:
        return []

    min_lng, max_lng, min_lat, max_lat = bounds
    candidates = IncidentReport.objects.filter(
        status="APPROVED",
        latitude__gte=min_lat,
        latitude__lte=max_lat,
        longitude__gte=min_lng,
        longitude__lte=max_lng,
    )
    return [
        incident
        for incident in candidates
        if is_point_near_route(
            incident.latitude,
            incident.longitude,
            coordinates,
            threshold=INCIDENT_ROUTE_DISTANCE_METERS,
        )
    ]


def _avoidance_options(incidents):
    polygons = []
    for incident in incidents:
        lat = float(incident.latitude)
        lng = float(incident.longitude)
        buffer = INCIDENT_AVOIDANCE_BUFFER_DEGREES
        polygons.append([
            [
                [lng - buffer, lat - buffer],
                [lng + buffer, lat - buffer],
                [lng + buffer, lat + buffer],
                [lng - buffer, lat + buffer],
                [lng - buffer, lat - buffer],
            ]
        ])

    return {
        "avoid_polygons": {
            "type": "MultiPolygon",
            "coordinates": polygons,
        }
    }


def get_route_preview(origin: dict, destination: dict, profile: str = "foot-walking") -> dict:
    """Fetch a route, avoid nearby approved reports, then score the final geometry."""
    api_key = get_openrouteservice_api_key()
    url = f"https://api.openrouteservice.org/v2/directions/{profile}/geojson"
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "coordinates": [
            [origin["lng"], origin["lat"]],
            [destination["lng"], destination["lat"]],
        ]
    }

    route_feature = _request_route(url, headers, payload)
    initial_geometry = route_feature["geometry"]
    nearby_incidents = _approved_incidents_near_route(initial_geometry)
    if nearby_incidents:
        reroute_payload = {
            **payload,
            "options": _avoidance_options(nearby_incidents),
        }
        route_feature = _request_route(
            url,
            headers,
            reroute_payload,
            avoiding_reports=True,
        )

    geometry = route_feature["geometry"]
    properties = route_feature.get("properties")
    summary = properties.get("summary") if isinstance(properties, dict) else None
    if not isinstance(summary, dict):
        raise RoutingProviderError("Routing provider returned invalid route details.")
    try:
        distance = float(summary["distance"])
        duration = float(summary["duration"])
        if (
            not math.isfinite(distance)
            or not math.isfinite(duration)
            or distance < 0
            or distance > 1_000_000
            or duration < 0
            or duration > 1_000_000
        ):
            raise ValueError
        distance_meters = round(distance)
        duration_seconds = round(duration)
    except (KeyError, TypeError, ValueError, OverflowError):
        raise RoutingProviderError("Routing provider returned invalid route details.") from None

    score_data = calculate_route_score(geometry)
    return {
        "distance_meters": distance_meters,
        "duration_seconds": duration_seconds,
        "geometry": geometry,
        "provider": "openrouteservice",
        "profile": profile,
        "safety_score": score_data["score"],
        "advisories": score_data["advisories"],
    }
