# Lock-Ad v3 Backend Guide

This document covers the Django REST backend.

## Stack

- Python
- Django
- Django REST Framework
- SQLite locally
- Django session authentication
- CSRF protection
- OpenRouteService integration through `navigation/services.py`
- PostgreSQL and Redis when running with Docker Compose

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
test -f .env || cp .env.example .env
python3 manage.py migrate
python3 manage.py runserver 8004
```

Backend URL:

```txt
http://127.0.0.1:8004
```

## Environment variables

Required:

```txt
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
```

Generate a secret with `python -c 'import secrets; print(secrets.token_urlsafe(64))'`. Django refuses to start in non-debug mode when this value is empty or still uses the example placeholder.

Optional/current:

```txt
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175
DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175
DJANGO_TRUST_X_FORWARDED_PROTO=False
INCIDENT_IMAGE_RETENTION_DAYS=
OPENROUTESERVICE_API_KEY=
GEMINI_API_KEY=
# Optional broker override; by default Redis uses REDIS_HOST (localhost locally,
# redis in Docker Compose).
# CELERY_BROKER_URL=redis://localhost:6379/2
```

Do not commit real secrets.
For Docker Compose, use the same `backend/.env` file for Django and PostgreSQL. From the repository root, copy `backend/.env.example` to `backend/.env` if it does not exist, set a strong `POSTGRES_PASSWORD`, and start the stack with `docker compose --env-file backend/.env up -d --build`. Single-quote values containing `$` so Compose passes them literally. Compose overrides `DJANGO_DEBUG` to `False` and binds the backend to loopback on port 8004.

Set `DJANGO_SECRET_KEY` in `backend/.env` to a unique random value before starting Compose; Django refuses to start in non-debug mode with an empty or template placeholder key. Compose uses HTTP by default for local development, so the example sets `DJANGO_SECURE_COOKIES=False`. Set it to `True` when the app is served over HTTPS so session and CSRF cookies are sent only over TLS.

An existing `postgres_data` volume keeps the database role and password it was initialized with; changing the Compose environment does not rotate credentials in that volume. Set matching credentials or rotate the database role before changing the configured password. Keep the volume during this transition; deleting it removes the database.

## Apps

```txt
core        shared/basic API endpoints
accounts    session authentication endpoints
navigation  route preview, provider integration, saved routes, and route context
safety_data incident reports, safety signals, and overlays
```

## Endpoints

Core:

```txt
GET /api/health/
GET /api/health/ready/
```

`/api/health/` reports whether Django responds. `/api/health/ready/` also checks database and cache access and returns `503` until those dependencies respond.

Accounts:

```txt
GET  /api/auth/csrf/
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
```

Navigation target:

```txt
POST /api/navigation/routes/preview/
```

Safety-data notes:

- Incident photos accept JPEG, PNG, or WebP up to 5 MB and 20 megapixels. Original file bytes are retained for evidence review under a random storage name; image access requires staff authorization. Report deletion queues its image for cleanup, and the configured retention job queues images from old closed reports. Failed media deletions remain queued for retry.
- Gemini calls are disabled by default with GEMINI_API_ENABLED=False. When enabled, route advisories may use Gemini; otherwise they use the local fallback. Incident-photo analysis additionally requires GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=True. When both switches are enabled, the async task sends the photo, incident category, and description to Gemini for a moderator-only review aid. The AI does not approve reports. Review [Report Privacy and AI Processing](PRIVACY_AND_AI.md) before enabling either switch.
- Other signed-in users can see an approved report's category, description, precise coordinates, and timestamps; pending reports are visible only to their reporter and staff. The submission dialog discloses this visibility. Attached photos are served through a staff-only endpoint.
- Photo analysis is queued through Celery after the incident record commits. Staff see the analysis lifecycle and can manually review when analysis fails. The moderator queue refreshes while work is pending. Compose starts the worker; local development needs a Redis broker and `celery -A backend worker --loglevel=info` from `backend/`. Run one `celery -A backend beat --loglevel=info` process for scheduled stale-analysis recovery and media-deletion retries. Production Compose starts one Beat instance.
- Incident reports do not publish a confidence score because the system has no calibrated incident-confidence calculation. A legacy database field remains hidden from the API.
- `POST /api/safety/advisory/` validates numeric weather and trip inputs and is rate-limited to 20 requests/hour for anonymous clients and 100/day for authenticated users.

See [Operations and Production Readiness](OPERATIONS.md) for TLS, worker,
backup, restore, and media-retention guidance, and [Report Privacy and AI
Processing](PRIVACY_AND_AI.md) for the report data-flow and provider checklist.

## Authentication flow

The frontend uses Django session authentication.

POST request flow:

```txt
1. GET /api/auth/csrf/
2. Send returned CSRF token in X-CSRFToken
3. Include browser credentials/cookies
```

## Reading provider keys from settings

In `backend/backend/settings.py`:

```py
OPENROUTESERVICE_API_KEY = os.getenv("OPENROUTESERVICE_API_KEY", "")
```

In app code:

```py
from django.conf import settings

api_key = settings.OPENROUTESERVICE_API_KEY
```

Use this in `navigation/services.py`, not in serializers or frontend code.

## Development commands

```bash
python3 manage.py check
python3 manage.py test
python3 manage.py makemigrations
python3 manage.py migrate
```

Before merging:

```bash
python3 manage.py check
python3 manage.py test
python3 manage.py makemigrations --check --dry-run
```
