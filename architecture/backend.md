# Backend Architecture

The backend of Lock-Ad v3 uses **Django**, **Django REST Framework (DRF)**, and **Django Channels**. It exposes the API, validates input, enforces server-side permissions, and contains integrations with routing and AI providers. Local development can use SQLite; Docker Compose runs PostgreSQL and Redis.

---

## Completed Backend Architecture

### 1. Django App Registry & Core Configuration

The project config is located under `backend/backend/`. Currently, the settings config (`settings.py`) loads environment variables using `python-dotenv` and lists the local applications:

- `core`: Shared core utility configurations and health checks.
- `accounts`: Complete user registration, login, logout, and session me-details.
- `navigation`: Route request validation, OpenRouteService integration, saved routes, and route scoring.
- `safety_data`: Incident reports, safety signals, image review, and authenticated incident WebSockets.
- `emergency`: User-owned emergency contacts.

### 2. Session Authentication & CSRF Protection

Lock-Ad v3 utilizes Django's session authentication instead of stateless JWTs. This mitigates token interception risks:

1. **CSRF Handshake**:
   - Endpoint: `GET /api/auth/csrf/`
   - Returns a fresh CSRF token in the response payload.
2. **Authenticated Requests**:
   - For all state-changing endpoints (e.g. `POST`, `PUT`, `DELETE`), the client must supply:
     - The CSRF token in the `X-CSRFToken` HTTP header.
     - Session credentials (cookies).
3. **Protected Auth Views**:
   - The register, login, logout, and self (`me`) views are guarded by `csrf_protect` and use standard Django django_login/django_logout.

### 3. Account Serializers & Validation

- `UserSerializer`: Serializes Django `User` model attributes (`id`, `username`, `email`).
- `RegisterSerializer`: Validates registration rules (valid username, email format, password constraints) and creates the user model records securely using `create_user`.

### 4. Tests

App tests use Django `TestCase` and DRF `APITestCase`. Run them from `backend/` using:
```bash
python manage.py test
```

## Routing and safety data flow

`POST /api/navigation/routes/preview/` validates origin, destination, and the supported `foot-walking` profile with `RoutePreviewRequestSerializer`. `navigation/services.py` requests route geometry from OpenRouteService, considers moderator-approved incidents near the initial route for avoidance, and delegates the final route score to `navigation/scoring.py`.

Incident and signal endpoints are routed through `safety_data/urls.py`. Serializers validate and shape their data; viewsets enforce permissions and queryset visibility. Image-backed reports are analyzed through `safety_data/ai_service.py`, and moderation status changes may be broadcast by `safety_data/signals.py` to authenticated Channels consumers.

Provider API keys belong in environment configuration. Keep provider calls in their service modules, return sanitized client errors, and keep session authentication plus CSRF protection for unsafe browser requests.
