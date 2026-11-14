from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('safety_data', '0006_backfill_incident_analysis_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='incidentreport',
            name='closed_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
