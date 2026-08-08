import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from safety_data.models import SafetySignal, IncidentReport

print("Clearing old data...")
SafetySignal.objects.all().delete()
IncidentReport.objects.all().delete()

# Around Laguna / Sto Tomas area (13.9414, 121.6236 is the default map view in Map.jsx)
signals = [
    {'source': 'LGU', 'signal_type': 'CCTV', 'name': 'Intersection CCTV', 'latitude': '13.9410', 'longitude': '121.6230'},
    {'source': 'LGU', 'signal_type': 'LIGHT', 'name': 'Street Light', 'latitude': '13.9450', 'longitude': '121.6250'},
    {'source': 'LGU', 'signal_type': 'MEDICAL', 'name': 'Barangay Clinic', 'latitude': '13.9400', 'longitude': '121.6200'},
]

print("Creating Safety Signals...")
for s in signals:
    SafetySignal.objects.create(**s)

incidents = [
    {'incident_type': 'HAZARD', 'description': 'Deep pothole', 'latitude': '13.9420', 'longitude': '121.6240', 'status': 'APPROVED'},
    {'incident_type': 'LIGHTING', 'description': 'Broken light', 'latitude': '13.9430', 'longitude': '121.6220', 'status': 'APPROVED'},
]

print("Creating Incidents...")
for i in incidents:
    IncidentReport.objects.create(**i)

print("Done! Mock data seeded.")
