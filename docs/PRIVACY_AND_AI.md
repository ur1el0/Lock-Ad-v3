# Privacy and AI data-flow notes

This is a technical inventory of the current application behavior, not a privacy
policy or legal assessment. Review the data flows, retention periods, notices,
and applicable requirements with the project owner before deploying with real
users or enabling external AI processing.

## Gemini switches

Gemini is disabled by default, even if `GEMINI_API_KEY` is configured:

- `GEMINI_API_ENABLED=False` disables Gemini-backed features and returns the
  local route-advisory fallback.
- `GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=False` independently keeps incident
  image analysis off. It can only be enabled when `GEMINI_API_ENABLED=True`.
- `GEMINI_API_KEY` stores the provider credential. It does not enable a feature.

Incident image analysis is synchronous and runs only when both switches are
enabled and a report includes a photo. The backend sends the photo, incident
category, and reporter-provided description to Google Gemini for a moderator
review aid. The aid is not a truth determination or an approval decision; a
human moderator reviews the report. If either switch is off, the submitted
photo stays available for manual moderator review and is not sent to Gemini.

The travel advisory uses route distance and duration plus weather code and
temperature. It does not require the user's account identity. With Gemini
disabled, the backend uses its local advisory fallback.

The API throttles incident image uploads to 10 per day, Gemini-backed
anonymous advisory requests to 20 per hour, and authenticated advisory requests
to 100 per day. These application limits do not replace infrastructure-level
abuse protection.

## Incident report visibility

Reports are private to their reporter while pending. Staff can review all
reports. Other authenticated users can see approved reports, including report
type, description, selected coordinates, status, confidence value, and report
and occurrence timestamps. Automated analysis is omitted from non-staff API
responses.

Incident photos are not included in ordinary report responses for non-staff
users. They are served through a staff-authorized endpoint; Django does not
publish the media directory through a debug-mode static route. Do not configure
a public object-storage or web-server media URL for these files without adding
equivalent access control.

The application currently does not define a product-level retention period for
incident reports or uploaded evidence. Decide and document retention, deletion,
backup handling, and any user-facing notice before production use.

## Operational checklist

- Keep both Gemini switches false until provider processing and user notice are
  approved.
- Keep real provider keys in the deployment environment, never in source
  control; do not enable image analysis merely because a key is available.
- Avoid uploading images containing identifiable people, vehicle plates, or
  unrelated personal details. The report form warns users about this.
- Review the returned AI text as untrusted and potentially inaccurate; never
  use it alone to approve, reject, or rank a report.
- Review storage access, deletion behavior, backups, incident response, and
  applicable privacy obligations before production launch.
