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
OPENROUTESERVICE_API_KEY=
GEMINI_API_KEY=
```

Do not commit real secrets.
For Docker Compose, also copy the repository root `.env.example` to `.env` and set a strong `POSTGRES_PASSWORD`. Compose reads database settings from that root file; the Django provider keys remain in `backend/.env`. Compose overrides `DJANGO_DEBUG` to `False` and publishes the backend on port 8004.

Set `DJANGO_SECRET_KEY` in `backend/.env` to a unique random value before starting Compose; Django refuses to start in non-debug mode with an empty or template placeholder key. Compose uses HTTP by default for local development, so its root example sets `DJANGO_SECURE_COOKIES=False`. Set it to `True` when the app is served over HTTPS so session and CSRF cookies are sent only over TLS.

An existing `postgres_data` volume keeps the database role and password it was initialized with; changing the Compose environment does not rotate credentials in that volume. Set matching credentials or rotate the database role before changing the configured password. Keep the volume during this transition; deleting it removes the database.

## Apps

```txt
core        shared/basic API endpoints
accounts    session authentication endpoints
navigation  route preview, provider integration, saved routes, and scoring
safety_data incident reports, safety signals, scoring, and overlays
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

- Incident photos accept JPEG, PNG, or WebP up to 5 MB and 20 megapixels. Original file bytes are retained for evidence review under a random storage name; image access requires staff authorization, and deleting a report schedules its image for deletion.
- When a photo is attached, both the photo and report description are sent to Gemini for a moderator-only review aid. The AI does not approve reports.
- `POST /api/safety/advisory/` validates numeric weather and trip inputs and is rate-limited to 20 requests/hour for anonymous clients and 100/day for authenticated users.

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
