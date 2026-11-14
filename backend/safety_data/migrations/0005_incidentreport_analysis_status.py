from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('safety_data', '0004_incidentreport_ai_analysis_incidentreport_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='incidentreport',
            name='analysis_status',
            field=models.CharField(
                choices=[
                    ('NOT_REQUESTED', 'Not requested'),
                    ('PENDING', 'Pending'),
                    ('PROCESSING', 'Processing'),
                    ('COMPLETED', 'Completed'),
                    ('FAILED', 'Unavailable'),
                ],
                default='NOT_REQUESTED',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='incidentreport',
            name='analysis_started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
