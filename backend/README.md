# Lock-Ad v3 Backend

This directory contains the Django REST backend for Lock-Ad v3.

## Tech stack

- Python
- Django
- Django REST Framework
- SQLite for local development
- Django session authentication
- CSRF protection for unsafe requests

## Setup

From the repository root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 manage.py migrate
python3 manage.py runserver
```

The backend runs at:

```txt
http://127.0.0.1:8000
```

## Environment variables

Create `backend/.env` from `backend/.env.example`.

Current required variable:

```txt
DJANGO_SECRET_KEY=your-secret-key-here
```

Optional variables used by settings:

```txt
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
```

Do not commit real secrets.

## Apps

```txt
core      shared/basic API endpoints
accounts  session authentication endpoints
```

Planned apps:

```txt
navigation  routing provider integration and route previews
safety      safety-related datasets and scoring logic
```

## Current endpoints

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

## Authentication flow

The frontend uses Django session authentication.

For POST requests:

```txt
1. GET /api/auth/csrf/
2. Send the returned CSRF token in X-CSRFToken
3. Include browser credentials/cookies
```

Login creates a Django session. Logout clears the session.

## Development commands

Run tests:

```bash
python3 manage.py test
```

Run Django checks:

```bash
python3 manage.py check
```

Create migrations:

```bash
python3 manage.py makemigrations
```

Apply migrations:

```bash
python3 manage.py migrate
```

## Notes

- Keep provider API keys in backend environment variables only.
- Do not place routing provider secrets in the React frontend.
- Password validation errors currently come from Django validators. The frontend error display can be improved later.
