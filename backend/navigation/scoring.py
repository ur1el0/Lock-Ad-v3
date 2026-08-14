import math
from safety_data.models import SafetySignal, IncidentReport

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

def is_point_near_route(point_lat, point_lon, route_coords, threshold=50):
    """
    Checks if a given coordinate is within `threshold` meters of ANY point 
    along the route's coordinate path.
    """
    for lon, lat in route_coords:
        if haversine_distance(point_lat, point_lon, lat, lon) <= threshold:
            return True
    return False

def calculate_route_score(geometry):
    """
    Evaluates a route GeoJSON LineString against nearby infrastructure and incidents.
    Returns a dictionary with 'score' and 'advisories'.
    """
    coordinates = geometry.get("coordinates", [])
    if not coordinates:
        return {"score": 70, "advisories": ["No geometry provided to calculate score."]}

    # 1. Calculate bounding box of the route to filter database queries
    min_lng = min([c[0] for c in coordinates])
    max_lng = max([c[0] for c in coordinates])
    min_lat = min([c[1] for c in coordinates])
    max_lat = max([c[1] for c in coordinates])

    # Add a ~500m buffer (0.005 degrees) to the bounding box
    buffer = 0.005
    min_lat -= buffer
    max_lat += buffer
    min_lng -= buffer
    max_lng += buffer

    # 2. Fetch nearby Safety Signals and Incidents
    nearby_signals = SafetySignal.objects.filter(
        latitude__gte=min_lat, latitude__lte=max_lat,
        longitude__gte=min_lng, longitude__lte=max_lng
    )
    
    nearby_incidents = IncidentReport.objects.filter(
        status__in=['PENDING', 'VERIFIED'],
        latitude__gte=min_lat, latitude__lte=max_lat,
        longitude__gte=min_lng, longitude__lte=max_lng
    )

    # 3. Scoring Engine
    baseline_score = 70
    score = baseline_score
    advisories = []
    
    # Counts
    counts = {
        'CCTV': 0,
        'LIGHT': 0,
        'POLICE': 0,
        'MEDICAL': 0,
        'INCIDENT': 0
    }

    # Evaluate signals
    for signal in nearby_signals:
        if is_point_near_route(signal.latitude, signal.longitude, coordinates, threshold=50):
            counts[signal.signal_type] += 1
            if signal.signal_type == 'CCTV':
                score += 5
            elif signal.signal_type == 'LIGHT':
                score += 1
            elif signal.signal_type == 'POLICE':
                score += 10
            elif signal.signal_type == 'MEDICAL':
                score += 5

    # Evaluate active incidents
    for incident in nearby_incidents:
        # Check within 100 meters for incidents (a slightly wider radius for warnings)
        if is_point_near_route(incident.latitude, incident.longitude, coordinates, threshold=100):
            counts['INCIDENT'] += 1
            score -= 15

    # Cap score
    score = max(0, min(100, score))

    # 4. Generate Advisories
    if counts['LIGHT'] > 0:
        advisories.append(f"Passes near {counts['LIGHT']} street lights.")
    if counts['CCTV'] > 0:
        advisories.append(f"Passes near {counts['CCTV']} CCTV cameras.")
    if counts['POLICE'] > 0:
        advisories.append(f"Passes near {counts['POLICE']} police stations.")
    if counts['MEDICAL'] > 0:
        advisories.append(f"Passes near {counts['MEDICAL']} medical facilities.")
    
    if counts['INCIDENT'] > 0:
        advisories.append(f"WARNING: Route passes within 100m of {counts['INCIDENT']} reported hazards/incidents.")
        
    if score == baseline_score and not advisories:
        advisories.append("Route has no known safety signals or incidents nearby.")
        
    return {
        "score": score,
        "advisories": advisories
    }
