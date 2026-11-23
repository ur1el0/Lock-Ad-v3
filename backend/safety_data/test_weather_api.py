from unittest.mock import Mock, patch

import requests
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class WeatherApiTests(APITestCase):
    @patch('safety_data.views.requests.get')
    def test_weather_response_uses_client_independent_field_names(self, get):
        provider_response = Mock()
        provider_response.json.return_value = {
            'current_weather': {
                'temperature': 28.5,
                'weathercode': 61,
                'time': '2026-11-14T10:00',
            },
        }
        get.return_value = provider_response

        response = self.client.get(
            reverse('get_weather'),
            {'lat': '14.6', 'lng': '121.0'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {
            'temperature': 28.5,
            'weather_code': 61,
            'condition': 'Rain',
        })

    @patch('safety_data.views.requests.get')
    def test_invalid_weather_payload_returns_bad_gateway(self, get):
        provider_response = Mock()
        provider_response.json.return_value = {'current_weather': None}
        get.return_value = provider_response

        response = self.client.get(
            reverse('get_weather'),
            {'lat': '14.6', 'lng': '121.0'},
        )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(
            response.data['error'],
            'Weather provider returned invalid data.',
        )

    @patch('safety_data.views.requests.get', side_effect=requests.Timeout)
    def test_weather_timeout_returns_bad_gateway(self, _get):
        response = self.client.get(
            reverse('get_weather'),
            {'lat': '14.6', 'lng': '121.0'},
        )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)

    @patch('safety_data.views.requests.get')
    def test_weather_rejects_out_of_range_code(self, get):
        provider_response = Mock()
        provider_response.json.return_value = {
            'current_weather': {'temperature': 28.5, 'weathercode': 150}
        }
        get.return_value = provider_response

        response = self.client.get(
            reverse('get_weather'),
            {'lat': '14.6', 'lng': '121.0'},
        )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
