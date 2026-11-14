from django.db import migrations


def mark_existing_analysis_complete(apps, schema_editor):
    IncidentReport = apps.get_model('safety_data', 'IncidentReport')
    reports = IncidentReport.objects.using(schema_editor.connection.alias)
    unavailable_message = (
        'Automated vision analysis unavailable. Manual review required.'
    )
    reports.filter(ai_analysis=unavailable_message).update(analysis_status='FAILED')
    reports.filter(ai_analysis__isnull=False).exclude(
        ai_analysis=''
    ).exclude(ai_analysis=unavailable_message).update(analysis_status='COMPLETED')


class Migration(migrations.Migration):

    dependencies = [
        ('safety_data', '0005_incidentreport_analysis_status'),
    ]

    operations = [
        migrations.RunPython(
            mark_existing_analysis_complete,
            migrations.RunPython.noop,
        ),
    ]
