import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from navigation.services import get_route_preview

origin = {'lat': 13.9381, 'lng': 121.6238}
destination = {'lat': 13.9442, 'lng': 121.6179}

try:
    result = get_route_preview(origin, destination)
    print("Score:", result.get('safety_score'))
    print("Advisories:", result.get('advisories'))
except Exception as e:
    print("Error:", e)
