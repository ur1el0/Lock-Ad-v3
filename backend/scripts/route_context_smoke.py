"""Explicit live smoke test for the route provider; run manually when configured."""

import os
import sys
from pathlib import Path


def main():
    backend_dir = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_dir))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

    import django
    django.setup()

    from navigation.services import get_route_preview

    origin = {'lat': 13.9381, 'lng': 121.6238}
    destination = {'lat': 13.9442, 'lng': 121.6179}
    result = get_route_preview(origin, destination)
    print('Route context:', result.get('route_context'))


if __name__ == '__main__':
    main()
