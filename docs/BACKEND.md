# Lock-Ad v3 Backend Guide

This document covers the Django REST backend.

## Stack

- Python
- Django
- Django REST Framework
- SQLite locally
- Django session authentication
- CSRF protection
- OpenRouteService integration planned through backend services

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 manage.py migrate
python3 manage.py runserver
```

Backend URL:

```txt
http://127.0.0.1:8000
```

## Environment variables

Required:

```txt
DJANGO_SECRET_KEY=your-secret-key-here
```

Optional/current:

```txt
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
OPENROUTESERVICE_API_KEY=your-openrouteservice-api-key
```

Do not commit real secrets.

## Apps

```txt
core        shared/basic API endpoints
accounts    session authentication endpoints
navigation  route preview and routing provider integration
safety      planned safety datasets, reports, scoring, and overlays
```

## Endpoints

Core:

```txt
GET /api/health/
```

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
