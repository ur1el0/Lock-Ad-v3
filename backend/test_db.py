import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from safety_data.models import SafetySignal
for s in SafetySignal.objects.filter(source='OSM'):
    print(f"{s.signal_type}: {s.name} at {s.latitude}, {s.longitude}")
