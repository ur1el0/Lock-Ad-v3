# Lock-Ad v3 Project README and Plan

Lock-Ad v3 is a full-stack cautious navigation platform for the Philippines. It helps users preview walking routes with safety-related context such as lighting, nearby public infrastructure, route distance, travel time, reports, weather, and available public datasets.

The app should not claim that any route is guaranteed safe. The correct product framing is:

```txt
cautious route
risk-aware route
safety-related signals
advisory route guidance
route context
```

Avoid:

```txt
guaranteed safe route
crime-free path
protected route
```

## Current stack

```txt
Backend: Django + Django REST Framework
Frontend: React + Vite
Auth: Django session authentication + CSRF protection
Routing provider: OpenRouteService through the backend
Current database: SQLite for local development
Future database: PostgreSQL
Future real-time: Django Channels + WebSockets
```

## Repository structure

```txt
Lock-Ad-v3/
├── backend/   Django REST API
├── frontend/  React + Vite client
└── docs/      project documentation
```

## Current implemented foundation

Implemented or planned in the current working project:

- Django REST backend
- React/Vite frontend
- Vite `/api` proxy to Django
- Session-based authentication
- CSRF token flow
- Register/login/logout/current-user endpoints
- Auth API client
- AuthProvider and `useAuth`
- Login and registration pages
- Protected routes and guest-only routes
- Authenticated home page with session controls
- Project documentation
- Initial `navigation` Django app
- OpenRouteService API key setting through `.env`
- Route preview request serializer work

## Product users

- Students
- Daily commuters
- Pedestrians
- Travelers
- People walking at night
- People who want route context before traveling
- Local moderators/admins reviewing public reports

## Core app flow

```txt
Guest user
→ register/login
→ authenticated home
→ enter origin and destination
→ preview cautious walking route
→ review distance, time, route, and safety-related context
→ optionally save route
→ optionally start trip
→ active tracking/check-in
```

## Backend app plan

```txt
core        shared/basic endpoints
accounts    auth/session user flows
navigation  routing provider integration and route previews
safety      safety datasets, reports, scoring, and overlays
```

`accounts` and `safety` are separate domains.

## Current API endpoints

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

## Route preview target

Target request:

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

Target response:

```json
{
  "distance_meters": 1200,
  "duration_seconds": 900,
  "geometry": {},
  "provider": "openrouteservice",
  "profile": "foot-walking"
}
```

Validation rules:

- Origin is required.
- Destination is required.
- Latitude must be between `-90` and `90`.
- Longitude must be between `-180` and `180`.
- Profile defaults to `foot-walking`.
- Only `foot-walking` is allowed at first.
- Origin and destination cannot be the same point.

## Safety-related data plan

Use multiple data sources. Do not rely on one crime API.

### OpenStreetMap + Overpass API

Useful for:

- roads
- footpaths
- alleys
- police stations
- hospitals
- building footprints
- street lighting tags such as `lit=yes` or `lit=no`
- CCTV/surveillance tags where mapped

### OpenRouteService

Useful for:

- walking routes
- route geometry
- distance and duration
- isochrones
- route generation that can later be combined with custom safety scoring

### Nominatim

Useful for:

- geocoding
- reverse geocoding

### OpenWeather

Useful for:

- rain
- storms
- visibility
- weather alerts

### Geoapify

Useful for:

- nearby places
- geocoding
- amenities

### PSGC

Useful for:

- regions
- provinces
- cities/municipalities
- barangays
- geographic codes
- administrative hierarchy

Not useful for:

- crime data
- CCTV data
- street light data
- safety incident data

### Philippine/local sources

Potential sources:

- PSA for population, demographics, and density
- PAGASA for rainfall, weather, and typhoon information
- DOST hazard services for hazard/disaster information where available
- DPWH for road and infrastructure datasets where available
- LGU open data for road closures, flood advisories, and traffic advisories
- PNP historical/public reports if available

Assumption:

```txt
No widely available public real-time crime API is expected.
```

## Architecture plan

Current architecture:

```txt
React frontend
  │
  ├─ REST API calls
  ▼
Django REST Framework backend
  │
  ├─ Django session auth
  ├─ CSRF protection
  ├─ SQLite locally
  └─ OpenRouteService integration through backend
```

Future architecture:

```txt
React frontend
  │
  ├─ REST API for auth, CRUD, routes, reports
  ├─ WebSocket connection for live events
  ▼
Django REST Framework backend
  │
  ├─ PostgreSQL
  ├─ Django Channels
  ├─ routing provider integration
  └─ safety data/scoring services
```

REST should handle:

- authentication
- registration/login/logout/me
- route preview requests
- saved routes
- user reports CRUD
- safety data CRUD/admin workflows

WebSockets should handle:

- live incident markers
- route re-evaluation events
- moderator dashboard updates
- emergency notifications

GraphQL is optional later. Use it only if the frontend needs flexible nested data in one request.

OAuth 2.0 is optional later for Sign in with Google or similar providers.

## MVP scope

Smallest useful version:

- Sign up and log in
- Enter origin and destination
- Request a walking route preview from the backend
- Show distance and estimated duration
- Display route geometry on a map
- Use cautious/risk-aware wording
- Keep OpenRouteService API key on the backend only
- Handle validation errors clearly

## Complex version

Expanded version:

- Full map UI with route overlays
- Saved routes and favorite places
- User-submitted reports
- Moderator dashboard
- Real-time incident markers using WebSockets
- Weather-aware route warnings
- Safety dataset overlays from OSM, LGU, PAGASA, DOST, DPWH, or PSA where available
- Custom route scoring engine
- Trip tracking
- Emergency contacts
- OAuth login
- AI route assistant
- AI report summaries
- AI explanation of route scoring factors

## AI feature plan

Possible AI features:

- route explanation in plain language
- summary of distance, duration, and safety-related context
- route comparison between fastest and cautious route options
- user report summarization for moderators
- trip summary after a completed route
- voice-friendly navigation hints
- commute pattern insights
- suggested commonly used destinations
- explanation of why a route is marked more cautious or less cautious

AI should explain and summarize. It should not invent safety facts.

## Build stages and branches

### 1. `feature/session-auth`

Status: finished/merged.

Scope:

- Django session auth endpoints
- CSRF setup
- register/login/logout/me

### 2. `feature/frontend-auth`

Status: finished/merged.

Scope:

- Auth API client
- AuthProvider/useAuth
- login/register pages
- protected/guest-only routes
- logout/session controls

### 3. `feature/navigation-api`

Status: active.

Scope:

- navigation Django app
- OpenRouteService settings
- route preview serializer
- routing provider service
- route preview endpoint
- route preview tests

Immediate next items:

```txt
1. Finish/fix route preview serializer.
2. Build backend/navigation/services.py.
3. Add navigation URLs and view.
4. Add tests with mocked provider calls.
```

### 4. `feature/frontend-map`

Scope:

- map library
- route input form
- route preview UI
- render route geometry

### 5. `feature/safety-data-models`

Scope:

- public safety-related data models
- user report models
- source tracking
- timestamp and confidence fields

### 6. `feature/safety-data-import`

Scope:

- OSM/Overpass import
- local dataset import
- scheduled/manual refresh

### 7. `feature/cautious-route-scoring`

Scope:

- scoring rules
- route segment weighting
- explainable score output

### 8. `feature/trip-tracking`

Scope:

- active trip state
- location updates
- route progress

### 9. `feature/emergency-contacts`

Scope:

- emergency contacts
- quick contact actions
- safety check-in flow

## Possible screens

- Landing page
- Login/Register
- Authenticated home
- Route planner
- Route preview details
- Map view
- Saved routes
- User reports
- Report submission form
- Moderator dashboard
- Safety data overlays
- Trip tracking screen
- AI route assistant
- Settings

## Development commands

Backend:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver
```

Backend checks:

```bash
python3 manage.py check
python3 manage.py test
python3 manage.py makemigrations --check --dry-run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend checks:

```bash
npm run lint
npm run build
```

## Commit rules

Keep commits separated by purpose.

Examples:

```txt
docs: update project planning documentation
feat(navigation): add routing provider service
fix(navigation): correct route preview validation defaults
test(navigation): add route preview API coverage
```

Do not commit:

- `.env`
- real API keys
- unrelated work
- empty placeholder files unless intentionally needed

## Safety note

Lock-Ad v3 should always communicate that route guidance is advisory. Crime, lighting, CCTV, weather, and hazard data can be incomplete, outdated, unavailable, or biased. The product should help users make more informed decisions, not guarantee personal safety.
