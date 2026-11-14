from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import TestCase

from safety_data.models import IncidentReport


class ApprovedIncidentBroadcastTests(TestCase):
    def setUp(self):
        self.report = IncidentReport.objects.create(
            user=User.objects.create_user(username='reporter'),
            incident_type='HAZARD',
            latitude=Decimal('14.600000000'),
            longitude=Decimal('121.000000000'),
            status='PENDING',
        )

    def test_approval_broadcast_is_registered_after_commit(self):
        group_send = object()
        publish = Mock()
        async_to_sync = Mock(return_value=publish)
        with patch('safety_data.signals.async_to_sync', async_to_sync):
            with patch(
                'safety_data.signals.get_channel_layer',
                return_value=SimpleNamespace(group_send=group_send),
            ):
                with self.captureOnCommitCallbacks(execute=True) as callbacks:
                    self.report.status = 'APPROVED'
                    self.report.save(update_fields=['status'])

        self.assertEqual(len(callbacks), 1)
        async_to_sync.assert_called_once_with(group_send)
        publish.assert_called_once_with(
            'incidents',
            {
                'type': 'incident_update',
                'message': {
                    'id': self.report.pk,
                    'incident_type': 'HAZARD',
                    'status': 'APPROVED',
                    'latitude': '14.600000000',
                    'longitude': '121.000000000',
                    'reported_at': self.report.reported_at.isoformat(),
                },
            },
        )

    def test_repeated_save_of_approved_report_does_not_broadcast_again(self):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.report.status = 'APPROVED'
            self.report.save(update_fields=['status'])

        self.assertEqual(len(callbacks), 1)
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.report.description = 'Additional context'
            self.report.save(update_fields=['description'])
        self.assertEqual(callbacks, [])

    def test_channel_failure_does_not_fail_the_database_status_change(self):
        with patch(
            'safety_data.signals.get_channel_layer',
            side_effect=ConnectionError('Redis unavailable'),
        ):
            with self.captureOnCommitCallbacks(execute=True):
                self.report.status = 'APPROVED'
                self.report.save(update_fields=['status'])

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, 'APPROVED')
