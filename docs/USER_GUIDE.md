# Lock-Ad v3 User Guide

This guide describes the current web app, not proposed features. Lock-Ad offers
walking-route previews and safety-related context; it does not guarantee that a
route or place is safe and is not an emergency-response service.

## Before you start

Run the backend and frontend using the instructions in the
[root README](../README.md). Open the frontend URL, normally
http://localhost:5173. The app uses a Django session, so keep the browser open
and use Log out when finished on a shared device.

## Create an account and sign in

1. Open Register and provide a username, email, password, and password
   confirmation.
2. If the password is rejected, follow the validation message and try again.
   Password policy is enforced by Django on the server.
3. Open Log in and use the same username and password.
4. Use the app navigation to log out. A staff account has moderator access;
   ordinary accounts do not.

The browser uses a session cookie and CSRF protection for changes. Do not copy
session cookies or CSRF tokens into messages, source files, or screenshots.

## Preview a walking route

1. Open Plan a route.
2. Enter the starting latitude and longitude. You may use the browser's
   location button, then approve the browser permission prompt.
3. Enter the destination latitude and longitude. This version accepts
   coordinates; it does not provide address search or geocoding.
4. Choose Preview route. The backend requests an OpenRouteService walking
   route and returns its geometry, distance, duration, and available route
   context.
5. Review the route and context as advisory information. A route preview does
   not continuously track you or guarantee safe passage.

Coordinates must be valid latitude and longitude values, and the start and
destination must differ. If the provider key is missing, the API reports that
routing is not configured. If the external provider cannot return a route,
retry later or choose different points.

### Understand route context

The preview can summarize mapped signals and approved community reports near
the route. Counts and timestamps describe records in Lock-Ad's database; they
are not a live inspection of the street. Missing markers do not mean a place
has no lights, cameras, hazards, or incidents. There is no calibrated numeric
safety score.

The optional travel advisory uses route distance, duration, and current weather
at the starting point. It uses a local fallback unless the project operator
has explicitly enabled Gemini. It is general context, not live emergency or
personal-safety advice.

## Use the map and submit a report

The map displays imported public-place signals and approved community reports
within the visible area when records are available. Coverage and freshness
vary; an empty map does not mean the area has no signals or reports. Check the
visible area and map filters, and see
[Data Sources and Coverage](DATA_SOURCES_AND_COVERAGE.md).

If the report form is available from the map, select the location, choose a
report type, add a concise description, and optionally attach a JPEG, PNG, or
WebP photo up to 5 MB. The location and report are submitted to the backend.

New reports enter Pending review. You and staff can see your pending report;
other signed-in users see a report only after it is approved. Approved reports
show the type, description, location, and timestamps. Photos and automated
analysis are restricted to staff. Avoid uploading identifiable faces, license
plates, or unrelated personal details.

Use reports for observations that are relevant to other pedestrians. Do not
include private information or treat a community report as an official police
record.

## Manage emergency contacts

The Contacts page stores a name, phone number, and relationship for a contact.
It is only a contact list: the current app does not send SOS messages, call
contacts, share live location, or dispatch emergency services. Do not rely on
it to request help.

The current API lets a signed-in user create, list, and view their own
contacts. Editing and deletion are staff-only at the API. The web interface
and API both enforce a three-contact limit. The contacts list is scoped to the
signed-in account.

## Moderator workflow

Staff accounts can open the moderator page to review reports. A moderator may
change a report's status. Approved reports can appear in route context and
other signed-in users' map results; pending reports remain private to their
reporter and staff. AI analysis, when deliberately enabled by the operator, is
only an aid for human review.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| Sign-in required | Sign in again; the session may have expired. |
| Request blocked / 403 | Reload the app to refresh the CSRF cookie and try again. |
| Route service is not configured | The backend operator must set the OpenRouteService key in the backend environment. |
| Route provider error | Check the provider/network and retry; the service may be unavailable or have no route for those points. |
| Current weather is unavailable | Check the network and retry. Route preview does not depend on weather. |
| Browser location is unavailable | Allow location access for the local site or enter coordinates manually. |
| The map has no markers or a saved/contact list is empty | Check the map area and filters, signed-in account, and network. Data may be unavailable or incomplete; missing markers do not establish safety. |

For developers, the [API reference](API_REFERENCE.md) describes response
formats and the [data-source guide](DATA_SOURCES_AND_COVERAGE.md) explains
where mapped context comes from.

## Safety and privacy limits

Lock-Ad is a prototype that helps users inspect available information. It
cannot verify a street's current condition, guarantee personal safety, or
replace local emergency services. Use current local guidance and your own
judgment. Review [Privacy and AI data-flow notes](PRIVACY_AND_AI.md) before
using real reports or enabling external AI processing.
