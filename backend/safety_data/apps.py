from django.apps import AppConfig


class SafetyDataConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'safety_data'

    def ready(self):
        import safety_data.signals # This loads the signals when Dajgno starts
