import math

import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from safety_data.models import SafetySignal


def parse_bbox(raw_bbox):
    try:
        values = [float(value.strip()) for value in raw_bbox.split(',')]
    except (AttributeError, ValueError):
        raise CommandError('Bounding box must be min_lat,min_lng,max_lat,max_lng.') from None

    if len(values) != 4 or not all(math.isfinite(value) for value in values):
        raise CommandError('Bounding box must contain four finite coordinates.')

    min_lat, min_lng, max_lat, max_lng = values
    if not (-90 <= min_lat < max_lat <= 90):
        raise CommandError('Bounding box latitude values are invalid.')
    if not (-180 <= min_lng < max_lng <= 180):
        raise CommandError('Bounding box longitude values are invalid.')

    return min_lat, min_lng, max_lat, max_lng


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
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Fetch and validate OSM data without changing database records.',
        )

    def handle(self, *args, **options):
        bbox = options['bbox']
        min_lat, min_lng, max_lat, max_lng = parse_bbox(bbox)
        overpass_bbox = ','.join(
            format(value, '.15g')
            for value in (min_lat, min_lng, max_lat, max_lng)
        )
        self.stdout.write(self.style.NOTICE(f'Starting OSM data import for bbox: {bbox}'))

        # Prepare Overpass QL query
        # Overpass expects bbox as: south,west,north,east
        # which matches min_lat,min_lng,max_lat,max_lng
        query = f"""
        [out:json][timeout:25];
        (
          node["amenity"="hospital"]({overpass_bbox});
          node["amenity"="clinic"]({overpass_bbox});
          node["amenity"="police"]({overpass_bbox});
          node["highway"="street_lamp"]({overpass_bbox});
          node["man_made"="surveillance"]({overpass_bbox});
          node["camera:mount"]({overpass_bbox});
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
        except (requests.exceptions.RequestException, ValueError) as e:
            self.stdout.write(self.style.ERROR(f'Error fetching data from Overpass API: {str(e)}'))
            return

        if not isinstance(data, dict) or not isinstance(data.get('elements'), list):
            raise CommandError('Overpass returned an invalid response; existing records were preserved.')

        elements = data['elements']
        self.stdout.write(self.style.SUCCESS(f'Successfully fetched {len(elements)} nodes from OSM.'))
        if not elements:
            self.stdout.write(self.style.WARNING(
                'Overpass returned no elements; existing OSM records were preserved.'
            ))
            return

        signals_to_create = []

        for element in elements:
            if not isinstance(element, dict):
                raise CommandError('Overpass returned a malformed element; existing records were preserved.')
            if element['type'] != 'node':
                continue

            lat = element.get('lat')
            lon = element.get('lon')
            tags = element.get('tags', {})

            if lat is None or lon is None or not isinstance(tags, dict):
                raise CommandError('Overpass returned an incomplete node; existing records were preserved.')
            try:
                lat = float(lat)
                lon = float(lon)
            except (TypeError, ValueError):
                raise CommandError('Overpass returned invalid coordinates; existing records were preserved.') from None
            if (
                not math.isfinite(lat)
                or not math.isfinite(lon)
                or not -90 <= lat <= 90
                or not -180 <= lon <= 180
                or not min_lat <= lat <= max_lat
                or not min_lng <= lon <= max_lng
            ):
                raise CommandError('Overpass returned out-of-bounds coordinates; existing records were preserved.')

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

        if not signals_to_create:
            self.stdout.write(self.style.WARNING(
                'No supported safety signals were returned; existing OSM records were preserved.'
            ))
            return

        existing_in_bbox = SafetySignal.objects.filter(
            source='OSM',
            latitude__gte=min_lat,
            latitude__lte=max_lat,
            longitude__gte=min_lng,
            longitude__lte=max_lng,
        )
        if options['dry_run']:
            self.stdout.write(self.style.WARNING(
                'Dry run preview:\n'
                f'Existing OSM records to replace: {existing_in_bbox.count()}\n'
                f'Supported signals to import: {len(signals_to_create)}\n'
                'No database changes were made.'
            ))
            return

        with transaction.atomic():
            deleted_count, _ = existing_in_bbox.delete()
            SafetySignal.objects.bulk_create(signals_to_create)

        self.stdout.write(f'Deleted {deleted_count} old OSM records inside the requested bounding box.')
        self.stdout.write(self.style.SUCCESS(f'Successfully imported {len(signals_to_create)} safety signals.'))
