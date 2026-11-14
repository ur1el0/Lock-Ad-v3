# Lock-Ad v3

Lock-Ad v3 is a full-stack cautious navigation platform for the Philippines. It combines route previews with safety-related context such as lighting, public infrastructure, reports, weather, and available public datasets.

Project documentation is indexed in [the docs directory](docs/); architecture
references and decision records are in [the architecture directory](architecture/).

Start here:

- [User Guide](docs/USER_GUIDE.md)
- [Project README and Plan](docs/PROJECT_README.md)
- [System Architecture](architecture/README.md)
- [API Reference](docs/API_REFERENCE.md)
- [Data Sources and Coverage](docs/DATA_SOURCES_AND_COVERAGE.md)
- [Backend Guide](docs/BACKEND.md)
- [Frontend Guide](docs/FRONTEND.md)
- [Operations and Production Readiness](docs/OPERATIONS.md)
- [Report Privacy and AI Processing](docs/PRIVACY_AND_AI.md)

The [documentation index](docs/README.md) lists all durable project guides.

## Quick start

Backend:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
test -f .env || cp .env.example .env
python3 manage.py migrate
python3 manage.py runserver 8004
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Docker Compose:

```bash
test -f backend/.env || cp backend/.env.example backend/.env
# Set a unique DJANGO_SECRET_KEY and a strong POSTGRES_PASSWORD in backend/.env.
docker compose --env-file backend/.env up -d --build
```

Compose frontend: http://localhost:8003. See the
[operations guide](docs/OPERATIONS.md) for production, backup, and restore
commands.

Use:

```txt
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:8004
```

Incident-photo analysis runs in a Celery worker and requires Redis. See the
[backend guide](docs/BACKEND.md) for local worker setup and the
[operations guide](docs/OPERATIONS.md) for Compose and production operations.
