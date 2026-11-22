# Data Sources and Coverage

This document records which external and user-provided data Lock-Ad currently
uses, what is not integrated, and how to interpret gaps. The presence of a
record is not evidence that a location is safe; the absence of a record is not
evidence that a hazard or service is absent.

## Sources currently used

| Source | Current use | What it does not establish |
| --- | --- | --- |
| OpenRouteService | Walking-route geometry, distance, and estimated duration. The backend sends the origin/destination coordinates and keeps the provider key server-side. | It does not provide a Lock-Ad safety assessment. Route availability and map coverage vary. |
| OpenStreetMap tiles | Browser-rendered base map with OpenStreetMap attribution. | A map tile is not a complete or authoritative inventory of local streets or services. |
| OpenStreetMap via Overpass | An operator-run importer adds mapped police, hospital/clinic, street-lamp, and surveillance nodes as safety signals. | OSM tags can be absent, stale, imprecise, or wrong; a mapped light/camera does not confirm that it works or is currently present. |
| Open-Meteo | Current weather used by the weather endpoint for supplied coordinates. | Weather is not crime, hazard, street-condition, or personal-safety data. |
| Community incident reports | User submissions for lighting issues, hazards, security incidents, and traffic accidents. They remain pending until staff review. | These are community observations, not official police records or independently verified facts. |

## OpenStreetMap import details

The manual backend command is:

    cd backend
    python manage.py import_osm_data --bbox min_lat,min_lng,max_lat,max_lng

Preview a refresh first with the same command plus `--dry-run`. It fetches and
validates the Overpass response, reports how many in-bounds records would be
replaced and how many supported signals would be imported, and makes no
database changes. The live run makes a new Overpass request, so its result may
differ from the preview.

The command queries Overpass for nodes tagged as hospitals, clinics, police,
street_lamps, or surveillance/camera mounts. It stores source OSM, the
selected signal type, name, coordinates, tags, and Lock-Ad database
timestamps. Its default bounding box is around Lucena City; always provide an
appropriate bounding box for another area.

The importer is not a scheduled refresh job. An empty, invalid, or
unsupported-only response preserves existing OSM records. A valid response
with at least one supported signal replaces OSM records in the requested area
with the returned set. The updated_at field records when Lock-Ad wrote the
row, not when the source feature was last verified. Plan controlled refreshes
and monitor Overpass availability before relying on imported coverage.

The query is limited to nodes and selected tags. It does not enumerate every
camera, light, road, police facility, or medical facility in a jurisdiction.
Surveyed completeness is not known.

Map marker popups show the recorded source and Lock-Ad's record-update time.
That timestamp does not say when the real-world feature was last present,
working, or inspected. The map also displays a coverage warning; missing
markers must not be interpreted as evidence that an area is safe or that a
service is absent.

## Community reports and moderation

Reports are created as PENDING and tied to the reporter. Staff can inspect all
reports. Other signed-in users can see approved reports, including their
category, description, location, and timestamps. The route-context summary
uses approved reports near the proposed route; nearby approved reports can
also be passed to the routing provider as avoidance areas.

This behavior is a cautious routing heuristic, not a validated risk model.
Report counts do not account for population, reporting rates, false reports,
time-of-day patterns, or unreported events. Do not describe the result as a
crime map or safety score. The current route-avoidance query has no report-age
cutoff: an approved report can continue to influence rerouting until its
moderation status changes. Consider the displayed report timestamps.

## Coverage and freshness

- Data coverage depends on the geographic area and local mapping/reporting
  activity.
- A source may omit features, use inconsistent tags, or have delayed updates.
- Import timestamps in Lock-Ad are not proof of real-world freshness.
- Reports can be mistaken, duplicated, resolved, or no longer current.
- A lack of markers must not be rendered as a clean bill of safety.
- The app currently has no calibrated numeric route-safety score.
- Route context and weather are advisory; users should consult current local
  guidance and make their own decisions.

## Candidate sources not integrated

These are research candidates only; their appearance here does not mean Lock-Ad
has an API connection, permission to reuse the data, or verified coverage.

| Candidate | Possible future role | Important boundary |
| --- | --- | --- |
| Philippine Standard Geographic Code (PSGC) | Administrative hierarchy and official identifiers for regions, provinces, cities/municipalities, and barangays. | PSGC is not a crime, lighting, CCTV, incident, or live hazard feed. |
| Philippine Statistics Authority (PSA) | Population and administrative statistical context, subject to license and suitable granularity. | Demographics must not be used as a proxy for individual or neighborhood danger. |
| PAGASA | Weather forecasts, rainfall, and severe-weather advisories, if suitable public access and terms are confirmed. | Not a crime or street-level condition source. |
| DOST hazard services | Selected hazard/disaster context where available and permitted. | Requires source-specific coverage, freshness, and licensing review. |
| DPWH and LGUs | Road works, closures, infrastructure, flood, or traffic notices where public datasets exist. | Availability, format, coverage, and update cadence differ by agency and locality. |
| PNP public reports | Historical/public crime context only if an appropriate official dataset is available and reuse is permitted. | No public real-time crime API is currently integrated or assumed. |

Before adding a source, record its owner, license/terms, geographic coverage,
update cadence, timestamps, accuracy, attribution requirements, failure
behavior, and the product wording allowed by the evidence. Keep a source
provenance field and display its age when that information is actually known.

## Related documentation

- [API Reference](API_REFERENCE.md) describes route-context fields and source
  timestamps.
- [Privacy and AI data-flow notes](PRIVACY_AND_AI.md) covers submitted
  coordinates, report visibility, photos, and optional Gemini processing.
- [Operations Guide](OPERATIONS.md) covers service configuration and
  deployment controls.
