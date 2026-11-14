"""Print imported OSM signals for a local manual inspection."""

import os
import sys
from pathlib import Path


def main():
    backend_dir = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_dir))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

    import django
    django.setup()

    from safety_data.models import SafetySignal

    for signal in SafetySignal.objects.filter(source='OSM'):
        print(f'{signal.signal_type}: {signal.name} at {signal.latitude}, {signal.longitude}')


if __name__ == '__main__':
    main()
