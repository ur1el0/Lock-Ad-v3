# Lock-Ad v3 Project Overview and Plan

Lock-Ad v3 is a web application for previewing walking routes and presenting
available safety-related context in the Philippines. It combines route
geometry with mapped public signals, moderated community reports, and current
weather information where available.

Lock-Ad is advisory software. It does not guarantee a safe route, verify every
reported condition, provide emergency response, or calculate a calibrated
numeric safety score.

## Documentation map

- [User Guide](USER_GUIDE.md): current user workflows.
- [System Architecture](../architecture/README.md): components and data flow.
- [API Reference](API_REFERENCE.md): endpoint contract and permissions.
- [Data Sources and Coverage](DATA_SOURCES_AND_COVERAGE.md): source provenance
  and limitations.
- [Backend Guide](BACKEND.md) and [Frontend Guide](FRONTEND.md): development
  setup.
- [Operations Guide](OPERATIONS.md): deployment, backup, and recovery.
- [Privacy and AI](PRIVACY_AND_AI.md): report visibility and optional Gemini
  processing.

## Product language

Prefer:

- cautious route
- risk-aware route
- safety-related signals
- route context or advisory

Avoid claims such as guaranteed safe route, crime-free path, protected route,
or secure navigation. The data does not justify those promises.

## Technology and repository

- Backend: Django, Django REST Framework, Django Channels, Celery.
- Frontend: React, Vite, React Router, Leaflet.
- Authentication: Django session cookies with CSRF protection.
- Routing: OpenRouteService accessed by the backend.
- Local database: SQLite. Docker Compose uses PostgreSQL.
- Cache, channel layer, and task broker: Redis in Compose.
- Background work: Celery worker for optional incident-photo analysis and
  media maintenance.

Repository areas:

- backend/: Django project and domain apps.
- frontend/: React web client.
- docs/: product, API, data, setup, privacy, and operations references.
- architecture/: system topology and architecture notes.

## Implemented capabilities

The current codebase includes:

- Account registration, login, logout, current-user session, and CSRF token
  endpoints.
- Protected React routes and guest-only login/registration routes.
- Walking-route preview through the backend, using the
  foot-walking OpenRouteService profile.
- Route distance, duration, GeoJSON geometry, and a coverage note with nearby
  mapped-signal and approved-report summaries.
- Rerouting requests that ask OpenRouteService to avoid areas around nearby
  approved reports.
- Saved-route API records with per-user ownership isolation.
- Safety-signal API and a manual OpenStreetMap/Overpass import command.
- Community incident submission, pending status, staff moderation, and
  staff-only report-image access.
- Authenticated WebSocket notifications when an incident becomes approved.
- Open-Meteo current-weather endpoint and a travel advisory with a local
  fallback; Gemini use is opt-in through backend flags.
- Emergency-contact records scoped to the owner, with staff-only update and
  deletion permissions.
- Docker Compose services and operational support for PostgreSQL, Redis,
  Django, Celery, and the frontend.

This list describes backend capabilities and UI elements in the code; it does
not mean every end-to-end screen is free of integration issues. See Known
integration gaps below.

## Backend domains

- core: health and dependency-readiness endpoints.
- accounts: session-authentication and user endpoints.
- navigation: route preview and saved routes.
- safety_data: signals, community reports, moderation, weather, and advisory.
- emergency: stored emergency-contact records.

The [API Reference](API_REFERENCE.md) is the canonical list of endpoints,
request fields, permissions, status codes, and response shapes.

## Current data boundaries

- OpenRouteService calculates walking geometry and route estimates; it is not
  a safety-data provider.
- OpenStreetMap is used for map tiles and selected signals imported manually
  through Overpass.
- Open-Meteo provides current weather for the requested coordinates.
- Community reports are user-submitted and moderator-reviewed; they are not
  official police data.
- PSGC is not integrated. It may support future administrative geography, but
  it does not provide crime, lighting, CCTV, or incident data.
- No public real-time crime feed is integrated or assumed.
- Gemini features are disabled by default and must not be treated as a source
  of factual safety determinations.

See [Data Sources and Coverage](DATA_SOURCES_AND_COVERAGE.md) for coverage,
freshness, provenance, and candidate sources.

## Known integration gaps

These are implementation findings from the current code revision and should be
checked again when the related client work is changed:

1. DRF list endpoints return a page object with a results array. Some frontend
   consumers still expect plain arrays: map signals/incidents, saved routes,
   and emergency contacts. These screens need response normalization and
   pagination handling.
2. The user response exposes is_staff, while the bottom navigation checks a
   role property for the moderator link. The moderator page itself checks
   is_staff, so the link visibility and route access can disagree.
3. Emergency-contact creation shows a three-item limit in the browser, but
   the API does not enforce the limit. Standard users can create/list/retrieve
   their own contacts; API updates and deletion are staff-only.
4. Route entry is coordinate-based; address search/geocoding is not part of
   the current API flow.
5. Map tracking-related state exists, but the web flow does not currently
   start a user-visible active trip. Do not describe this as live trip
   tracking.
6. Emergency contacts are records only; no SOS message, call, location share,
   or dispatch operation is implemented.
7. Approved reports used for route avoidance have no age cutoff. Their
   timestamps should be considered; this is not a validated or freshness-aware
   risk model.

These are follow-up engineering items, not alternative API contracts. Do not
hide them by weakening the API's paginated response shape or by implying an
unimplemented safety capability.

## Roadmap

### 1. Stabilize current API-to-UI contracts

- Normalize paginated list responses at the API-client boundary or consumers.
- Follow next pages where the UI needs complete lists.
- Add frontend tests for map markers, saved routes, contacts, and staff
  navigation using paginated response fixtures.
- Align the moderator navigation check with the user field returned by the
  backend.
- Decide and document the intended owner-level edit/delete policy for
  emergency contacts, then make the UI/API permissions agree.

### 2. Validate safety-data coverage

- Choose a small pilot area and verify imported records with local partners or
  field observation.
- Show source, timestamp, and coverage caveats wherever signals are displayed.
- Define an operator-controlled OSM refresh process and failure monitoring.
- Evaluate additional public/LGU datasets only after confirming licensing,
  coverage, update cadence, and privacy implications.
- Keep any future route score out of the product until its target, evidence,
  calibration, bias review, and explanation can be defended.

### 3. Improve route planning

- Decide whether address/place search is required and select a geocoder only
  after reviewing terms, attribution, rate limits, and Philippine coverage.
- Improve route comparison and context presentation without promising safety.
- Keep provider keys and provider-specific payloads on the backend.

### 4. Define, then build trip tracking

Before implementation, decide location permission timing, whether location
leaves the device, user-controlled sharing, foreground/background behavior,
retention and deletion, stop/arrival behavior, connectivity failure, and abuse
controls. The React Native client may live in a separate repository; agree on
an API contract that supports web and mobile without coupling the backend to a
single client.

### 5. Define emergency workflows separately

Stored contacts alone are not an emergency feature. Before adding an SOS
workflow, define exactly whether it calls, sends SMS, shares location, uses an
external provider, or simply opens the device dialer. Obtain consent, model
delivery failures, protect phone/location data, and clearly state that
delivery is not guaranteed.

### 6. Revisit optional AI only with explicit controls

Keep Gemini disabled unless provider processing, data notices, cost/rate
limits, retention, and fallbacks have been reviewed. Treat outputs as
untrusted moderator or travel-context assistance, never an approval decision
or safety fact.

## Release and review gates

Before calling a feature complete:

- Its actual API contract and authorization are documented.
- Frontend behavior matches success, empty, loading, validation, permission,
  and provider-failure responses.
- Tests cover the feature's important permissions and failure paths.
- External data has a source, provenance, license/terms, and freshness story.
- User-facing copy does not overstate certainty or emergency capability.
- Secrets, session/CSRF behavior, media access, logging, and retention have
  been reviewed for the changed data flow.

## Local development

Use the root [README](../README.md) for the quick start. See the
[Backend Guide](BACKEND.md), [Frontend Guide](FRONTEND.md), and
[Operations Guide](OPERATIONS.md) for detailed setup and commands.
