import requests
from django.core.management.base import BaseCommand
from safety_data.models import SafetySignal

class Command(BaseCommand):
    help = 'Imports safety signals (streetlights, CCTV, police, medical) from OpenStreetMap Overpass API'

    def add_arguments(self, parser):
        # Default bounding box is around Lucena City
        parser.add_argument(
            '--bbox',
            type=str,
            default='13.91,121.58,13.97,121.65',
            help='Bounding box in format: min_lat,min_lng,max_lat,max_lng'
        )

    def handle(self, *args, **options):
        bbox = options['bbox']
        self.stdout.write(self.style.NOTICE(f'Starting OSM data import for bbox: {bbox}'))

        # Prepare Overpass QL query
        # Overpass expects bbox as: south,west,north,east
        # which matches min_lat,min_lng,max_lat,max_lng
        query = f"""
        [out:json][timeout:25];
        (
          node["amenity"="hospital"]({bbox});
          node["amenity"="clinic"]({bbox});
          node["amenity"="police"]({bbox});
          node["highway"="street_lamp"]({bbox});
          node["man_made"="surveillance"]({bbox});
          node["camera:mount"]({bbox});
        );
        out center;
        """

        url = "https://overpass-api.de/api/interpreter"
        self.stdout.write('Fetching data from Overpass API (this may take a moment)...')

        headers = {
            'User-Agent': 'LockAd/1.0 (Contact: admin@lockad.com)',
            'Accept': 'application/json'
        }

        try:
            response = requests.post(url, data={'data': query}, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Error fetching data from Overpass API: {str(e)}'))
            return

        elements = data.get('elements', [])
        self.stdout.write(self.style.SUCCESS(f'Successfully fetched {len(elements)} nodes from OSM.'))

        # Clear existing OSM data
        deleted_count, _ = SafetySignal.objects.filter(source='OSM').delete()
        self.stdout.write(f'Deleted {deleted_count} old OSM records from the database.')

        signals_to_create = []

        for element in elements:
            if element['type'] != 'node':
                continue

            lat = element.get('lat')
            lon = element.get('lon')
            tags = element.get('tags', {})

            if not lat or not lon:
                continue

            # Determine signal type
            signal_type = None
            name = tags.get('name', '')

            if tags.get('amenity') in ['hospital', 'clinic']:
                signal_type = 'MEDICAL'
                if not name:
                    name = 'OSM Medical Facility'
            elif tags.get('amenity') == 'police':
                signal_type = 'POLICE'
                if not name:
                    name = 'OSM Police Station'
            elif tags.get('highway') == 'street_lamp':
                signal_type = 'LIGHT'
                if not name:
                    name = 'OSM Street Light'
            elif tags.get('man_made') == 'surveillance' or 'camera:mount' in tags:
                signal_type = 'CCTV'
                if not name:
                    name = 'OSM CCTV Camera'
            else:
                continue

            signal = SafetySignal(
                source='OSM',
                signal_type=signal_type,
                name=name,
                latitude=lat,
                longitude=lon,
                tags=tags
            )
            signals_to_create.append(signal)

        if signals_to_create:
            SafetySignal.objects.bulk_create(signals_to_create)
            self.stdout.write(self.style.SUCCESS(f'Successfully imported {len(signals_to_create)} safety signals.'))
        else:
            self.stdout.write(self.style.WARNING('No valid safety signals found in the specified bounding box.'))
