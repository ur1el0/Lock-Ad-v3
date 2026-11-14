from django.db import migrations, models


def prevent_rollback_with_pending_deletions(apps, schema_editor):
    IncidentImageDeletion = apps.get_model('safety_data', 'IncidentImageDeletion')
    if IncidentImageDeletion.objects.using(schema_editor.connection.alias).exists():
        raise RuntimeError(
            'Process pending incident image deletions before rolling back this migration.'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('safety_data', '0008_backfill_closed_incident_reports'),
    ]

    operations = [
        migrations.CreateModel(
            name='IncidentImageDeletion',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('image_name', models.CharField(max_length=512, unique=True)),
                ('attempts', models.PositiveIntegerField(default=0)),
                ('last_error', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
        ),
        migrations.RunPython(
            migrations.RunPython.noop,
            prevent_rollback_with_pending_deletions,
        ),
    ]
