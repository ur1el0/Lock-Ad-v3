# Backend Architecture

The backend of Lock-Ad v3 is powered by **Django** and **Django REST Framework (DRF)**. It enforces security guidelines, wraps external routing engines, and is designed to scale from SQLite locally to PostgreSQL in production.

---

## Completed Backend Architecture

### 1. Django App Registry & Core Configuration

The project config is located under `backend/backend/`. Currently, the settings config (`settings.py`) loads environment variables using `python-dotenv` and lists the local applications:

- `core`: Shared core utility configurations and health checks.
- `accounts`: Complete user registration, login, logout, and session me-details.
- `navigation`: Route generation logic, serializers, and routing integrations.
- `safety` (planned): Public datasets ingestor, user community reporting, and route scoring module.

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

### 4. Code Coverage

The `accounts` app contains automated unit tests verifying the registration, invalid login, valid login, logout, and current user session flows. Run these test suites using:
```bash
../venv/bin/python manage.py test
```

---

## Planned/Under-Construction Backend Modules

The focus is currently on the `navigation` app.

### 1. Route Preview Request Validation

We have created the preliminary serializers in `backend/navigation/serializers.py`:
- `CoordinateSerializer`: Validates latitude (`lat` between -90 and 90) and longitude (`lng` between -180 and 180).
- `RoutePreviewRequestSerializer`: Maps `origin`, `destination`, and `profile` fields.

> [!IMPORTANT]
> **Audit Note**: The `profile` field in `RoutePreviewRequestSerializer` is configured with `default=['foot-walking']`, which is a list instead of a string. This needs to be corrected to `default='foot-walking'` to ensure the field returns a clean string value upon deserialization.

### 2. Service Layer (to be built)

To avoid thick views and tight coupling, external API calls are directed into a dedicated service layer:
- File: `backend/navigation/services.py` (currently empty).
- Responsibility: Call OpenRouteService (ORS) using the API key stored in the environment variables, parsing JSON geometries, distance, and duration safely.

### 3. Route Views & Routes (to be built)

- Endpoint: `POST /api/navigation/routes/preview/`
- Views: Will parse coordinates, invoke `services.py` methods, format the response, and return routing context.
