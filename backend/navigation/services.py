from time import time
import requests
from django.conf import settings

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
    url = f"https://api/openrouteservice/v2/directions/{profile}/geojson"

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

        return {
            "distance_meters": int(summary.get("distance", 0)),
            "duration_seconds": int(summary.get("duration", 0)),
            "geometry": geometry,
            "provider": "openrouteservice",
            "profile": profile
        }

    except requests.exceptions.Timeout:
        raise RoutingProviderError("Routing provider request timed out.")
    except requests.exceptions.RequestException as e:
        raise RoutingProviderError(f"Routing provider error: {str(e)}")