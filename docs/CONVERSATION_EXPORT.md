# Lock-Ad v3 Conversation Export

This file exports the usable project context, decisions, instructions, and current working plan from the Codex collaboration so far.

It does not include hidden system/developer instructions verbatim. It does include the practical working preferences and project knowledge needed to continue the work.

## Project

```txt
Name: Lock-Ad v3
Repo: /home/dokja/vsc-fedora/all/Projects/django-projects/Lock-Ad-v3
Backend: Django + Django REST Framework
Frontend: React + Vite
Current focus: navigation route preview backend
Pilot area: Lucena City / Philippines context
```

Lock-Ad v3 is a safety-aware navigation app. The app should help users plan cautious routes by combining routing data with public safety-related signals. It must not claim that a route is guaranteed safe.

Preferred language:

```txt
cautious route
risk-aware route
safety-related signals
route preview
advisory information
```

Avoid language like:

```txt
safe route guaranteed
crime-free path
protected route
```

## User working preferences

The user wants:

- Step-by-step guidance.
- Minimal code when possible.
- Detailed logic that can be translated into code manually.
- Code blocks only when useful.
- Each code block explained when provided.
- Frequent checks/audits before committing or proceeding.
- Separate commits by purpose/use.
- Branches for major feature areas.
- The user often implements manually and asks Codex to check.

When guiding:

```txt
1. Inspect current files first.
2. Explain what is wrong or next.
3. Give exact files involved.
4. Give minimal code or logic.
5. Give commit message and files.
6. Do not mix unrelated changes in one commit.
```

## Product plan

Major backend apps planned:

```txt
core        shared/basic endpoints
accounts    auth/session user flows
navigation  routing provider integration and route previews
safety      safety datasets, signals, and scoring
```

Accounts and safety are separate domains.

High-level future flow:

```txt
Guest user
→ register/login
→ authenticated home
→ enter destination
→ preview cautious walking route
→ start trip
→ active trip tracking
→ stop trip
```

## Technical architecture notes from `Lock-Ad-v3-Technical-Notes.md`

The technical notes add these architecture decisions and future options.

### REST, GraphQL, and WebSockets

Current implementation should continue with REST first.

```txt
REST:
- authentication
- registration/login/logout/me
- route preview requests
- saved routes
- user reports CRUD
- safety data CRUD/admin workflows
```

GraphQL is optional later, not required for the current branch.

Use GraphQL only if the frontend starts needing flexible nested data in one request, for example:

```txt
- route metadata with related reports
- user profile + saved routes + recent reports
- moderator dashboard summaries
- map overlays with nested safety data
```

GraphQL does not replace WebSockets.

WebSockets are for real-time server-to-client updates.

Recommended future stack:

```txt
Frontend: React + native WebSocket API
Backend: Django Channels
Database: PostgreSQL
```

Typical future real-time report flow:

```txt
1. User submits a report through REST.
2. Django validates and stores it in PostgreSQL.
3. Django Channels broadcasts the new report.
4. Connected clients receive the event immediately.
5. The frontend updates map markers or route warnings.
```

Future WebSocket use cases:

```txt
- live incident markers
- route re-evaluation
- moderator dashboard updates
- emergency notifications
```

Rule:

```txt
REST = create/read/update/delete data.
WebSockets = notify connected users when something changes.
```

### OAuth 2.0

OAuth 2.0 is optional later for:

```txt
- Sign in with Google
- third-party identity provider login
```

Current authentication remains Django session authentication. OAuth can be added after core auth and route preview are stable.

## Public API/data research decisions

PSGC:

```txt
Philippine Standard Geographic Code is useful for geographic hierarchy:
- regions
- provinces
- cities/municipalities
- barangays

It is not a crime, CCTV, street light, or safety incident API.
Use it for place codes and administrative boundaries, not safety scoring.
```

Routing:

```txt
Use OpenRouteService through the backend only.
Never expose routing API keys to the frontend.
```

Primary public APIs and data sources from the technical notes:

```txt
OpenStreetMap + Overpass API:
- roads
- footpaths
- alleys
- police stations
- hospitals
- building footprints
- street lights if tagged
- CCTV if tagged

Nominatim:
- geocoding
- reverse geocoding

OpenRouteService:
- walking route generation
- route geometry
- distance and duration
- isochrones
- route generation that can later be combined with custom safety scoring

OpenWeather:
- rain
- storms
- visibility
- weather alerts

Geoapify:
- nearby places
- geocoding
- amenities
```

Philippine/local data sources from the technical notes:

```txt
PSA:
- population
- demographics
- population density

PAGASA:
- weather
- rainfall
- typhoon information

DOST hazard services:
- hazard and disaster information where available

DPWH:
- road and infrastructure datasets where available

LGU open data:
- road closures
- flood advisories
- traffic advisories
- city/provincial notices

PNP:
- no widely available public real-time crime API found
- historical reports may still be useful for analytics if available
```

Important framing:

```txt
Safety data can be incomplete, stale, biased, or unavailable.
The app should show cautious/risk-aware suggestions, not guarantees.
```

Recommended long-term architecture:

```txt
React frontend
  │
  ├─ REST API for auth, CRUD, routes, reports
  │
  ▼
Django REST Framework backend
  │
  ├─ PostgreSQL for durable app data
  ├─ Django Channels for real-time events
  │
  ▼
Connected users receive live updates

External data:
- OpenStreetMap / Overpass
- OpenRouteService
- OpenWeather
- PSA / PAGASA / DOST / DPWH / LGU datasets
```

Important product direction:

```txt
User reports should become the primary real-time data source.
External datasets should support route context and scoring.
```

## Repository state summary

Main has already received:

```txt
docs: add project setup readmes
Merge PR: feature/frontend-auth
Merge PR: feature/session-auth
```

README files added:

```txt
README.md
backend/README.md
frontend/README.md
```

Current active branch recently:

```txt
feature/navigation-api
```

Recent navigation commits observed:

```txt
feat(navigation): create navigation backend app
chore(navigation): configure routing provider settings
build(backend): add HTTP client dependency
feat(navigation): validate route preview requests
fix(backend): added navigation app
```

Current known uncommitted work before this export:

```txt
M  backend/navigation/serializers.py
?? backend/navigation/services.py
```

Known state:

- `backend/navigation/services.py` existed but was empty.
- `backend/navigation/serializers.py` had one remaining bug:

```py
default=['foot-walking']
```

It should be:

```py
default='foot-walking'
```

## Backend current architecture

Installed apps:

```txt
django.contrib.admin
django.contrib.auth
django.contrib.contenttypes
django.contrib.sessions
django.contrib.messages
django.contrib.staticfiles
rest_framework
core
accounts
navigation
```

REST Framework defaults:

```py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

Current project URLs:

```txt
/admin/
/api/
/api/auth/
```

Core endpoint:

```txt
GET /api/health/
```

Accounts endpoints:

```txt
GET  /api/auth/csrf/
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
```

## Backend auth details

Session authentication is used.

CSRF flow:

```txt
1. Frontend calls GET /api/auth/csrf/
2. Backend returns csrfToken
3. Frontend sends POST with X-CSRFToken
4. Browser credentials/cookies are included
```

Known CSRF fix:

```py
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

Known `ALLOWED_HOSTS` improvement:

```py
ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS",
    "127.0.0.1,localhost"
).split(",")
```

OpenRouteService setting:

```py
OPENROUTESERVICE_API_KEY = os.getenv("OPENROUTESERVICE_API_KEY", "")
```

`.env.example` should contain:

```txt
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=
DJANGO_ALLOWED_HOSTS=
OPENROUTESERVICE_API_KEY=your-openrouteservice-api-key
```

Never commit real `.env` values or API keys.

## Frontend current architecture

Frontend stack:

```txt
React
Vite
React Router
ESLint
```

Vite proxy:

```js
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    }
  }
}
```

Use frontend URL for testing:

```txt
http://localhost:5173
```

Do not browse the React app through:

```txt
http://127.0.0.1:8000
```

Frontend source structure:

```txt
frontend/src/
├── api/
│   ├── auth.js
│   └── client.js
├── components/
│   ├── GuestOnlyRoute.jsx
│   └── RequireAuth.jsx
├── context/
│   ├── AuthContext.js
│   └── AuthProvider.jsx
├── hooks/
│   └── useAuth.js
├── pages/
│   ├── LoginPage.jsx
│   └── RegisterPage.jsx
├── App.jsx
├── index.css
└── main.jsx
```

Current routes:

```txt
/          protected home page
/login     guest-only login page
/register  guest-only registration page
```

Frontend auth pieces:

```txt
AuthProvider
- stores user
- checks current session using /api/auth/me/
- exposes login/register/logout

useAuth
- reads AuthContext
- throws if used outside AuthProvider

RequireAuth
- loading -> Loading...
- unauthenticated -> /login
- authenticated -> children

GuestOnlyRoute
- loading -> Loading...
- authenticated -> /
- unauthenticated -> children
```

Known frontend auth issue for later:

```txt
DRF validation errors are not displayed well yet.
Example backend response:
{
  "password": ["This password is too common."]
}

Frontend currently may show:
"Request failed with status 400"

Future task:
Improve frontend validation error messages.
```

## Navigation API current plan

Branch:

```txt
feature/navigation-api
```

Target endpoint:

```txt
POST /api/navigation/routes/preview/
```

Target input:

```json
{
  "origin": {
    "lat": 13.9414,
    "lng": 121.6236
  },
  "destination": {
    "lat": 13.9442,
    "lng": 121.6179
  },
  "profile": "foot-walking"
}
```

Target output:

```json
{
  "distance_meters": 1200,
  "duration_seconds": 900,
  "geometry": {},
  "provider": "openrouteservice",
  "profile": "foot-walking"
}
```

Request validation rules:

```txt
origin is required
destination is required
origin.lat must be between -90 and 90
origin.lng must be between -180 and 180
destination.lat must be between -90 and 90
destination.lng must be between -180 and 180
profile defaults to foot-walking
only allow foot-walking for now
origin and destination cannot be the same point
```

Expected serializer:

```py
from rest_framework import serializers


class CoordinateSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


class RoutePreviewRequestSerializer(serializers.Serializer):
    origin = CoordinateSerializer()
    destination = CoordinateSerializer()
    profile = serializers.ChoiceField(
        choices=['foot-walking'],
        default='foot-walking',
        required=False,
    )

    def validate(self, attrs):
        if attrs['origin'] == attrs['destination']:
            raise serializers.ValidationError(
                'Origin and destination cannot be the same point.'
            )
        return attrs
```

Commit after fixing serializer:

```bash
git add backend/navigation/serializers.py
git commit -m "fix(navigation): correct route preview validation defaults"
```

## How to read API key from Django settings

In `backend/backend/settings.py`:

```py
OPENROUTESERVICE_API_KEY = os.getenv("OPENROUTESERVICE_API_KEY", "")
```

In a normal Django app file, read it from `django.conf.settings`:

```py
from django.conf import settings

api_key = settings.OPENROUTESERVICE_API_KEY
```

Use this in `backend/navigation/services.py`, not in serializers.

Why:

```txt
settings.py reads from .env/environment.
services.py reads the configured Django setting.
The frontend never sees the key.
```

Recommended service logic:

```txt
Input:
- validated serializer data

Steps:
1. Read settings.OPENROUTESERVICE_API_KEY
2. If missing, raise a controlled configuration error
3. Convert {lat, lng} to [lng, lat], because routing providers usually expect longitude first
4. POST to OpenRouteService
5. Use timeout
6. Handle provider HTTP/network errors
7. Normalize distance, duration, geometry
8. Return app-owned response shape
```

Minimal service skeleton planned:

```py
from django.conf import settings


class RoutingConfigurationError(Exception):
    pass


def get_openrouteservice_api_key():
    api_key = settings.OPENROUTESERVICE_API_KEY

    if not api_key:
        raise RoutingConfigurationError(
            'OpenRouteService API key is not configured.'
        )

    return api_key
```

Explanation:

```txt
settings.OPENROUTESERVICE_API_KEY reads the value configured in settings.py.
The helper gives one place to validate whether the key exists.
The custom exception lets views return a clean API error later.
```

## Next navigation stages

After serializer fix:

### Stage 1: Build `navigation/services.py`

Purpose:

```txt
Call OpenRouteService and normalize the route response.
```

Should include:

```txt
RoutingConfigurationError
RoutingProviderError
get_openrouteservice_api_key()
coordinate conversion helper
route preview function
provider response normalization
```

Commit:

```bash
git add backend/navigation/services.py
git commit -m "feat(navigation): add routing provider service"
```

### Stage 2: Build API view

Files:

```txt
backend/navigation/views.py
backend/navigation/urls.py
backend/backend/urls.py
```

Endpoint:

```txt
POST /api/navigation/routes/preview/
```

Expected behavior:

```txt
400 invalid serializer input
503 missing route provider config
502 provider error
504 provider timeout
200 successful route preview
```

Commit:

```bash
git add backend/navigation/views.py backend/navigation/urls.py backend/backend/urls.py
git commit -m "feat(navigation): expose route preview endpoint"
```

### Stage 3: Add tests

Tests should mock external HTTP calls. Do not call OpenRouteService in tests.

Test areas:

```txt
serializer valid request
serializer invalid coordinates
serializer identical origin/destination
view requires authentication
view returns validation errors
service handles missing API key
service handles provider timeout/error
```

Commit:

```bash
git add backend/navigation/tests.py
git commit -m "test(navigation): add route preview API coverage"
```

## Useful commands

Backend setup:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver
```

If the venv is at repo root:

```bash
source ../venv/bin/activate
```

Backend checks:

```bash
cd backend
python3 manage.py check
python3 manage.py test
python3 manage.py makemigrations --check --dry-run
```

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

Git status:

```bash
git status --short --branch
git log --oneline --decorate --max-count=8
```

## Commit conventions used

Examples:

```txt
docs: add project setup readmes
feat(frontend): add authentication API client
fix(frontend): correct authentication API client
feat(frontend): add authentication context provider
feat(frontend): add authentication context hook
feat(frontend): configure authentication routes
feat(frontend): add login page
feat(frontend): add registration page
feat(frontend): protect authentication routes
feat(frontend): add authenticated home session controls
fix(backend): trust local frontend origin for csrf
feat(navigation): create navigation backend app
chore(navigation): configure routing provider settings
build(backend): add HTTP client dependency
feat(navigation): validate route preview requests
fix(navigation): correct route preview validation defaults
```

## Known issues / cleanup

Navigation:

```txt
Fix RoutePreviewRequestSerializer profile default from list to string.
Do not commit empty services.py.
```

Backend environment:

```txt
If manage.py check/test fails with:
ModuleNotFoundError: No module named 'rest_framework'

Cause:
Wrong Python environment active.

Fix:
Activate the backend/repo venv and install requirements.
```

Frontend:

```txt
Improve DRF validation error formatting later.
```

Git:

```txt
Keep commits separated by purpose.
Do not mix serializer fixes with provider service code.
Do not commit .env, API keys, db.sqlite3 changes unless intentionally needed.
```

## How to continue from here

Immediate next action:

```txt
1. Fix backend/navigation/serializers.py:
   default='foot-walking'

2. Commit:
   fix(navigation): correct route preview validation defaults

3. Then build backend/navigation/services.py.
```

Ask Codex:

```txt
check
```

after each commit or stage.
