from time import time
import requests
from django.conf import settings
from safety_data.models import IncidentReport
from .scoring import calculate_route_score

# 1. Custom Exceptions
class RoutingConfigurationError(Exception):
    """Raised when the routing key is not configured in Django settings."""
    pass

class RoutingProviderError(Exception):
    """Raised when the external API returns an error or fails."""
    pass

# 2. Key Retriever Helper
def get_openrouteservice_api_key():
    api_key = getattr(settings, "OPENROUTESERVICE_API_KEY", '')
    if not api_key:
        raise RoutingConfigurationError("OpenRouteService API key is not configured.")
    return api_key

# 3. Main Route Service
def get_route_preview(origin: dict, destination: dict, profile: str = "foot-walking") -> dict:
    """
    Fetcches route geometry, distance, and duration from OpenRouteService.

    :param origin: dict with key 'lat' and 'lng'
    :param destination: dict with keys 'lat' and 'lng'
    :param profile: string routing profile
    """
    api_key = get_openrouteservice_api_key()
    url = f"https://api.openrouteservice.org/v2/directions/{profile}/geojson"

    # Header configuration
    headers = {
        "Authorization" : api_key,
        "Content-Type" : "application/json"
    }
    
    # Remember: ORS expects [longitude, latitude] 
    payload = {
        "coordinates": [
            [origin["lng"], origin["lat"]],
            [destination["lng"], destination["lat"]],
        ]
    }

    active_incidents = IncidentReport.objects.exclude(status__in=['RESOLVED', 'SPAM'])

    avoid_polygons_coords = []

    # ~11 meter radius buffer (0.0001 degrees)
    buffer = 0.0001

    for incident in active_incidents:
        lat = float(incident.latitude)
        lng = float(incident.longitude)

        # ORS expects [longitude, latitute ] arrays
        # We define the 4 corners of the square, repeat the first point to close it.
        polygon = [
            [
                [lng - buffer, lat - buffer],
                [lng + buffer, lat - buffer],
                [lng + buffer, lat + buffer],
                [lng - buffer, lat + buffer],
                [lng - buffer, lat - buffer],
            ]
        ]
        avoid_polygons_coords.append(polygon)

    if avoid_polygons_coords:
        payload["options"] = {
            "avoid_polygons": {
                "type": "MultiPolygon",
                "coordinates": avoid_polygons_coords
            }
        }

            
    try: 
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # 4. Extract data
        features = data.get("features", [])
        if not features:
            raise RoutingProviderError("No route feature found in response")

        route_feature = features[0]
        summary = route_feature.get("properties", {}).get("summary", {})
        geometry = route_feature.get("geometry", {})

        score_data = calculate_route_score(geometry)

        return {
            "distance_meters": int(summary.get("distance", 0)),
            "duration_seconds": int(summary.get("duration", 0)),
            "geometry": geometry,
            "provider": "openrouteservice",
            "profile": profile,
            "safety_score": score_data["score"],
            "advisories": score_data["advisories"]
        }

    except requests.exceptions.Timeout:
        raise RoutingProviderError("Routing provider request timed out.")
    except requests.exceptions.RequestException as e:
        error_msg = f"Routing provider error: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            if e.response.status_code == 404:
                raise RoutingProviderError("No route found! The hazard is blocking the only available path, or it is placed directly on your origin/destination.")
            error_msg += f" | Details: {e.response.text}"
        raise RoutingProviderError(error_msg)