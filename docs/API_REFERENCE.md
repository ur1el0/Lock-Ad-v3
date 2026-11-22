# Lock-Ad v3 API Reference

This is the endpoint contract implemented by the Django backend. The API uses
trailing slashes. JSON endpoints return JSON unless noted otherwise. List
endpoints use Django REST Framework page-number pagination with a default page
size of 50:

    {
      "count": 76,
      "next": "http://127.0.0.1:8004/api/safety/incidents/?page=2",
      "previous": null,
      "results": []
    }

Direct API callers must consume the results array and follow next when more
pages are needed. The React collection helpers follow every next link and
return a flat array to page components.

## Authentication and CSRF

Authentication is Django session-cookie authentication, not JWT. Browsers must
send credentials and include the CSRF token on unsafe requests:

1. GET /api/auth/csrf/ and read csrfToken.
2. Send it as X-CSRFToken on POST, PUT, PATCH, and DELETE requests.
3. Include the session cookie / browser credentials.

| Method | Endpoint | Access | Contract |
| --- | --- | --- | --- |
| GET | /api/auth/csrf/ | Public | Returns csrfToken. |
| POST | /api/auth/register/ | Public + CSRF | Body: username, email, password, password_confirm. Returns the user object with 201. |
| POST | /api/auth/login/ | Public + CSRF | Body: username, password. Returns the user object; invalid credentials return 401. |
| POST | /api/auth/logout/ | Signed in + CSRF | Ends the session; returns 204. |
| GET | /api/auth/me/ | Signed in | Returns the current user. |

User object:

    {
      "id": 12,
      "username": "sample",
      "email": "sample@example.com",
      "is_staff": false
    }

## Core

| Method | Endpoint | Access | Contract |
| --- | --- | --- | --- |
| GET | /api/health/ | Public | Liveness response: status and service. |
| GET | /api/health/ready/ | Public | Checks the database and cache. Returns 503 with status not_ready when a dependency check fails. |

## Navigation

### Route preview

POST /api/navigation/routes/preview/ requires a signed-in user and CSRF token.

Request:

    {
      "origin": {"lat": 13.9414, "lng": 121.6236},
      "destination": {"lat": 13.9442, "lng": 121.6179},
      "profile": "foot-walking"
    }

Profile is optional and defaults to foot-walking; that is currently the only
accepted profile. Latitude is limited to -90..90, longitude to -180..180, and
the two points cannot be equal.

Successful response (values abbreviated):

    {
      "distance_meters": 1200,
      "duration_seconds": 900,
      "geometry": {
        "type": "LineString",
        "coordinates": [[121.62, 13.94], [121.621, 13.941]]
      },
      "provider": "openrouteservice",
      "profile": "foot-walking",
      "route_context": {
        "signals": [
          {
            "signal_type": "LIGHT",
            "source": "OSM",
            "count": 3,
            "last_updated_at": "2026-11-14T10:00:00+00:00"
          }
        ],
        "incident_reports": [],
        "coverage_note": "Mapped data may be incomplete..."
      }
    }

GeoJSON coordinates are ordered longitude, latitude. Context lists nearby
signal and approved-report summaries; they are not a safety score. A missing
OPENROUTESERVICE_API_KEY returns 503. A provider failure or invalid route
response returns 502.

### Saved routes

| Method | Endpoint | Access | Contract |
| --- | --- | --- | --- |
| GET | /api/navigation/saved-routes/ | Signed in | Paginated list; standard users see their own routes, staff see all. |
| POST | /api/navigation/saved-routes/ | Signed in + CSRF | Create for current user. |
| GET | /api/navigation/saved-routes/{id}/ | Signed in | Retrieve within the user's permitted queryset. |
| PUT/PATCH/DELETE | /api/navigation/saved-routes/{id}/ | Staff + CSRF | Update or delete. |

Create fields: name, origin_lat, origin_lng, dest_lat, dest_lng. The response
also includes id and created_at.

## Safety data

### Signals

GET /api/safety/signals/ requires authentication. The response is paginated.
Optional bounding-box filtering uses all four query parameters together:
min_lat, max_lat, min_lng, and max_lng. Partial bounds, nonnumeric values,
coordinates outside latitude -90..90 / longitude -180..180, or reversed ranges
return 400. Each result contains the model fields: id, source, signal_type,
name, latitude, longitude, tags, created_at, and updated_at. `updated_at`
indicates when the record was last saved in Lock-Ad; it is not the source's
inspection or verification time. Current source values are OSM, LGU, and PSA;
signal types are CCTV, LIGHT, POLICE, and MEDICAL.

### Incident reports

| Method | Endpoint | Access | Contract |
| --- | --- | --- | --- |
| GET | /api/safety/incidents/ | Signed in | Paginated. Staff see all; other users see their own reports and approved reports. Supports the validated bounding-box parameters described under Signals. |
| POST | /api/safety/incidents/ | Signed in + CSRF | Creates a pending report owned by the current user. |
| GET | /api/safety/incidents/{id}/ | Signed in | Retrieves only a report visible in that user's queryset. |
| PUT/PATCH/DELETE | /api/safety/incidents/{id}/ | Staff + CSRF | Staff moderation/update or deletion actions. |
| GET | /api/safety/incidents/{id}/image/ | Staff | Streams a private report image with no-store and nosniff headers. |

Create fields:

- incident_type: LIGHTING, HAZARD, INCIDENT, or ACCIDENT.
- latitude and longitude: required decimal coordinates.
- description: optional, at most 2,000 characters.
- image: optional multipart file; JPEG, PNG, or WebP, at most 5 MB and 20 megapixels.
- occurred_at: optional timestamp; defaults to the current time.

Regular users cannot set status, analysis fields, or an owner. Creation sets
status to PENDING. Staff can set a moderation status of PENDING, APPROVED,
RESOLVED, or SPAM. Images are write-only for regular users; staff responses
include a staff-only image URL when an image exists. Automated analysis fields
are hidden from non-staff responses. No calibrated confidence score is
returned.

### Weather and travel advisory

| Method | Endpoint | Access | Contract |
| --- | --- | --- | --- |
| GET | /api/safety/weather/?lat={lat}&lng={lng} | Public | Returns temperature, weather_code, and condition from Open-Meteo; provider failures return 502. |
| POST | /api/safety/advisory/ | Public, rate limited | Body: distance, duration, weather_code, temperature. Returns advisory text. |

Advisory validation accepts distance and duration from 0 to 1,000,000,
weather_code from 0 to 99, and temperature from -100 to 100.

The advisory uses a local fallback unless Gemini is explicitly enabled in
backend settings. Gemini is disabled by default; see
[Privacy and AI data-flow notes](PRIVACY_AND_AI.md).

## Emergency contacts

| Method | Endpoint | Access | Contract |
| --- | --- | --- | --- |
| GET | /api/emergency/contacts/ | Signed in | Paginated; users see their own contacts and staff see all. |
| POST | /api/emergency/contacts/ | Signed in + CSRF | Creates a contact for current user. |
| GET | /api/emergency/contacts/{id}/ | Signed in | Retrieves within the permitted queryset. |
| PUT/PATCH/DELETE | /api/emergency/contacts/{id}/ | Staff + CSRF | Update or delete. |

Fields: name (100 characters maximum), phone_number (20 maximum), and
relationship (50 maximum). Each user can create up to three emergency
contacts; additional create requests return 400. The API stores contact
information only; it does not initiate an SOS, call, or message.

## Approved-report WebSocket

Connect to /ws/incidents/ using the authenticated session cookie. Anonymous
connections are closed. The server broadcasts when a report transitions to
APPROVED:

    {
      "type": "incident_update",
      "data": {
        "id": 42,
        "incident_type": "HAZARD",
        "status": "APPROVED",
        "latitude": "13.940000000",
        "longitude": "121.620000000",
        "reported_at": "2026-11-14T10:00:00+00:00"
      }
    }

## Common status codes

| Status | Meaning |
| --- | --- |
| 200 | Request succeeded. |
| 201 | Resource created. |
| 204 | Request succeeded with no response body, commonly logout/delete. |
| 400 | Validation error or malformed request. |
| 401 | Authentication required or login credentials rejected. |
| 403 | Permission or CSRF check failed. |
| 404 | Resource is absent or outside the user's permitted queryset. |
| 502 | External provider failed or returned an invalid response. |
| 503 | A required service is not configured or not ready. |

## Client integration note

The backend's paginated list contract is authoritative. React API helpers use
the shared getAllPages function to collect results and follow next links. It
normalizes provider-generated links to same-origin /api/ paths before sending
browser credentials. New collection callers should use that helper or
explicitly handle the complete page envelope; do not change the backend to
return bare arrays.
