import math
from safety_data.models import SafetySignal, IncidentReport


ROUTE_DATA_BUFFER_DEGREES = 0.005
SIGNAL_ROUTE_DISTANCE_METERS = 50
INCIDENT_ROUTE_DISTANCE_METERS = 100


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in meters between two points 
    on the earth (specified in decimal degrees).
    """
    # Convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [float(lon1), float(lat1), float(lon2), float(lat2)])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371000 # Radius of earth in meters
    return c * r


def route_bounding_box(route_coords, buffer_degrees=ROUTE_DATA_BUFFER_DEGREES):
    """Return a buffered (min_lng, max_lng, min_lat, max_lat) route box."""
    if not route_coords:
        return None

    longitudes = [float(point[0]) for point in route_coords]
    latitudes = [float(point[1]) for point in route_coords]
    return (
        min(longitudes) - buffer_degrees,
        max(longitudes) + buffer_degrees,
        min(latitudes) - buffer_degrees,
        max(latitudes) + buffer_degrees,
    )


def is_point_near_route(point_lat, point_lon, route_coords, threshold=50):
    """
    Check distance to route segments, including positions between GeoJSON vertices.

    A local equirectangular projection is accurate enough for this app's
    neighborhood-scale routes and avoids treating sparse vertices as the route.
    """
    if not route_coords:
        return False

    point_lat = float(point_lat)
    point_lon = float(point_lon)
    meters_per_degree_lat = 111_320
    meters_per_degree_lon = meters_per_degree_lat * math.cos(math.radians(point_lat))
    projected = [
        (
            (float(lon) - point_lon) * meters_per_degree_lon,
            (float(lat) - point_lat) * meters_per_degree_lat,
        )
        for lon, lat in route_coords
    ]

    if len(projected) == 1 and math.hypot(*projected[0]) <= threshold:
        return True

    for start, end in zip(projected, projected[1:]):
        segment_x = end[0] - start[0]
        segment_y = end[1] - start[1]
        segment_length_squared = segment_x ** 2 + segment_y ** 2
        if segment_length_squared == 0:
            nearest_x, nearest_y = start
        else:
            projection = max(
                0,
                min(
                    1,
                    -(start[0] * segment_x + start[1] * segment_y)
                    / segment_length_squared,
                ),
            )
            nearest_x = start[0] + projection * segment_x
            nearest_y = start[1] + projection * segment_y

        if math.hypot(nearest_x, nearest_y) <= threshold:
            return True

    return False

def calculate_route_context(geometry):
    """Summarize mapped signals and approved reports near a route."""
    coordinates = geometry.get("coordinates", [])
    context = {
        "signals": [],
        "incident_reports": [],
        "coverage_note": (
            "Mapped data may be incomplete. This information is not a safety rating, "
            "and listed conditions have not been live-verified."
        ),
    }
    if not coordinates:
        return context

    # 1. Calculate bounding box of the route to filter database queries
    min_lng, max_lng, min_lat, max_lat = route_bounding_box(coordinates)

    # 2. Fetch nearby Safety Signals and Incidents
    nearby_signals = SafetySignal.objects.filter(
        latitude__gte=min_lat, latitude__lte=max_lat,
        longitude__gte=min_lng, longitude__lte=max_lng
    )
    
    nearby_incidents = IncidentReport.objects.filter(
        status='APPROVED',
        latitude__gte=min_lat, latitude__lte=max_lat,
        longitude__gte=min_lng, longitude__lte=max_lng
    )

    signal_summaries = {}
    for signal in nearby_signals:
        if is_point_near_route(
            signal.latitude,
            signal.longitude,
            coordinates,
            threshold=SIGNAL_ROUTE_DISTANCE_METERS,
        ):
            key = (signal.signal_type, signal.source)
            summary = signal_summaries.setdefault(key, {
                "signal_type": signal.signal_type,
                "source": signal.source,
                "count": 0,
                "last_updated_at": signal.updated_at,
            })
            summary["count"] += 1
            summary["last_updated_at"] = max(
                summary["last_updated_at"], signal.updated_at
            )

    incident_summaries = {}
    for incident in nearby_incidents:
        if is_point_near_route(
            incident.latitude,
            incident.longitude,
            coordinates,
            threshold=INCIDENT_ROUTE_DISTANCE_METERS,
        ):
            summary = incident_summaries.setdefault(incident.incident_type, {
                "incident_type": incident.incident_type,
                "count": 0,
                "latest_reported_at": incident.reported_at,
            })
            summary["count"] += 1
            summary["latest_reported_at"] = max(
                summary["latest_reported_at"], incident.reported_at
            )

    context["signals"] = [
        {
            **summary,
            "last_updated_at": summary["last_updated_at"].isoformat(),
        }
        for summary in sorted(
            signal_summaries.values(),
            key=lambda item: (item["signal_type"], item["source"]),
        )
    ]
    context["incident_reports"] = [
        {
            **summary,
            "latest_reported_at": summary["latest_reported_at"].isoformat(),
        }
        for summary in sorted(
            incident_summaries.values(), key=lambda item: item["incident_type"]
        )
    ]
    return context
