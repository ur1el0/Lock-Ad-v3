from io import StringIO
from unittest.mock import Mock, patch

from django.core.management import call_command, CommandError
from django.test import TestCase

from safety_data.models import SafetySignal


class ImportOsmDataTests(TestCase):
    bbox = '13.9,121.5,14.1,121.7'

    def create_osm_signal(self, name, latitude, longitude):
        return SafetySignal.objects.create(
            source='OSM',
            signal_type='LIGHT',
            name=name,
            latitude=latitude,
            longitude=longitude,
        )

    @patch('safety_data.management.commands.import_osm_data.requests.post')
    def test_empty_response_preserves_existing_records(self, post):
        existing = self.create_osm_signal('Existing light', '14.0', '121.6')
        response = Mock()
        response.json.return_value = {'elements': []}
        post.return_value = response

        call_command('import_osm_data', bbox=self.bbox)

        self.assertTrue(SafetySignal.objects.filter(pk=existing.pk).exists())

    @patch('safety_data.management.commands.import_osm_data.requests.post')
    def test_import_replaces_only_records_inside_the_requested_bbox(self, post):
        inside = self.create_osm_signal('Old inside light', '14.0', '121.6')
        outside = self.create_osm_signal('Outside light', '14.2', '121.8')
        response = Mock()
        response.json.return_value = {
            'elements': [{
                'type': 'node',
                'lat': 14.01,
                'lon': 121.61,
                'tags': {'highway': 'street_lamp'},
            }],
        }
        post.return_value = response

        call_command('import_osm_data', bbox=self.bbox)

        self.assertFalse(SafetySignal.objects.filter(pk=inside.pk).exists())
        self.assertTrue(SafetySignal.objects.filter(pk=outside.pk).exists())
        self.assertTrue(SafetySignal.objects.filter(
            source='OSM', name='OSM Street Light', latitude='14.010000000',
        ).exists())

    @patch('safety_data.management.commands.import_osm_data.requests.post')
    def test_dry_run_reports_replacement_without_changing_records(self, post):
        inside = self.create_osm_signal('Existing inside light', '14.0', '121.6')
        outside = self.create_osm_signal('Existing outside light', '14.2', '121.8')
        response = Mock()
        response.json.return_value = {
            'elements': [{
                'type': 'node',
                'lat': 14.01,
                'lon': 121.61,
                'tags': {'highway': 'street_lamp'},
            }],
        }
        post.return_value = response
        output = StringIO()

        call_command(
            'import_osm_data',
            bbox=self.bbox,
            dry_run=True,
            stdout=output,
        )

        self.assertTrue(SafetySignal.objects.filter(pk=inside.pk).exists())
        self.assertTrue(SafetySignal.objects.filter(pk=outside.pk).exists())
        self.assertEqual(SafetySignal.objects.count(), 2)
        self.assertIn('Existing OSM records to replace: 1', output.getvalue())
        self.assertIn('Supported signals to import: 1', output.getvalue())
        self.assertIn('No database changes were made.', output.getvalue())
        post.assert_called_once()

    @patch('safety_data.management.commands.import_osm_data.requests.post')
    def test_malformed_response_preserves_existing_records(self, post):
        existing = self.create_osm_signal('Existing light', '14.0', '121.6')
        response = Mock()
        response.json.return_value = {'unexpected': []}
        post.return_value = response

        with self.assertRaises(CommandError):
            call_command('import_osm_data', bbox=self.bbox)

        self.assertTrue(SafetySignal.objects.filter(pk=existing.pk).exists())

    def test_invalid_bbox_is_rejected_before_the_provider_is_called(self):
        with patch('safety_data.management.commands.import_osm_data.requests.post') as post:
            with self.assertRaises(CommandError):
                call_command('import_osm_data', bbox='13.9,121.7,14.1,121.5')

        post.assert_not_called()
