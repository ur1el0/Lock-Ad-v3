from django.db import migrations
from django.utils import timezone


def mark_existing_closed_reports(apps, schema_editor):
    IncidentReport = apps.get_model('safety_data', 'IncidentReport')
    IncidentReport.objects.using(schema_editor.connection.alias).filter(
        status__in=['APPROVED', 'RESOLVED', 'SPAM'],
        closed_at__isnull=True,
    ).update(closed_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ('safety_data', '0007_incidentreport_closed_at'),
    ]

    operations = [
        migrations.RunPython(
            mark_existing_closed_reports,
            migrations.RunPython.noop,
        ),
    ]
