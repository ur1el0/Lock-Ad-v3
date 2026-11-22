# Operations and Production Readiness

## Services

Docker Compose runs PostgreSQL, Redis, the Django ASGI service, a Celery worker,
and the React frontend. Django runs database migrations before serving. The
worker starts after Django is healthy and shares its database, Redis broker, and
incident-media volume. Redis persistence is enabled for the task queue and
channel/cache state.

Incident-photo analysis is asynchronous. A successful report submission stores
the report and queues analysis after the database transaction commits. Staff
can see `PENDING`, `PROCESSING`, `COMPLETED`, or `FAILED` alongside the review
aid. Transient provider failures retry up to three times; a final failure leaves
the report available for manual review. If the queue is unavailable at submit
time, the report is retained and analysis is marked unavailable.
If a delayed retry cannot be published, the report is also marked for manual
review instead of remaining pending without a queued task.
Late acknowledgements, a short processing lease, and a periodic stale-task
sweep allow analysis to recover if a worker exits unexpectedly. A durable
deletion queue retries media cleanup after report deletion or retention expiry,
including when storage is temporarily unavailable.

For a local backend outside Compose, run a Redis broker and a worker from the
`backend/` directory:

```bash
celery -A backend worker --loglevel=info
```

Set `REDIS_HOST` or `CELERY_BROKER_URL` for the broker address. Do not enable
Celery eager mode in production. Run one `celery -A backend beat --loglevel=info`
process locally if you need scheduled stale-analysis recovery or media-deletion
retries.

The Redis visibility timeout is longer than the longest task retry countdown.
Keep it above the largest `countdown` used by Celery tasks to avoid redelivering
scheduled retries before their execution time.

## Production configuration

- Use Docker Compose 2.30 or later. Supply `backend/.env` with `--env-file` for
  Compose interpolation and service configuration. Single-quote values that
  contain `$` so Compose and the service env-file parser preserve them literally.
- Copy `backend/.env.example` to `backend/.env` if the environment file does not exist.
  Set `PUBLIC_DOMAIN` to the public DNS name, `DJANGO_SECURE_COOKIES=True`,
  and `DJANGO_TRUST_X_FORWARDED_PROTO=True`. The Compose defaults add that
  domain to Django's allowed hosts, CSRF trusted origins, and CORS origins.
  Set a unique Django secret, database credentials, and provider API keys in
  the deployment environment as well.
- Point the domain's DNS records at this host and allow inbound TCP ports 80 and
  443. Start the production profile with
  `docker compose --env-file backend/.env --profile production up -d --build`. Caddy redirects HTTP to
  HTTPS, obtains and renews certificates, and persists certificate state in
  `caddy_data`. It proxies the frontend, API, admin, and WebSocket paths.
- Keep `DJANGO_TRUST_X_FORWARDED_PROTO=True` only while Django is reachable
  through the controlled Nginx frontend proxy. The Django service remains bound
  to loopback on the host; the frontend's host port is loopback-only.
- Monitor backend, worker, PostgreSQL, and Redis health. Worker errors are
  logged without report descriptions or provider credentials.
- Review pending image-deletion attempts in Django admin if media storage
  failures persist. The queue records the exception class and retries them.

## External incident-photo analysis

All Gemini API calls are disabled by default. Set GEMINI_API_ENABLED=True only
after reviewing the provider's current terms, confirming that the selected
service tier and the application's intended audience are eligible, and
approving the data-processing purpose. Incident-photo analysis additionally
requires GEMINI_INCIDENT_IMAGE_ANALYSIS_ENABLED=True. With Gemini disabled,
route advisories use the local fallback and photos remain for manual review.
These flags are operator opt-ins; the application cannot verify the Gemini
project's billing tier or contractual eligibility.

The Gemini API Additional Terms effective March 23, 2026 describe the APIs as
developer services for professional or business purposes, not consumer use,
and distinguish unpaid from paid services. For unpaid services, Google may use
submitted content and generated responses to improve products and services, and
human reviewers may process them; the terms say not to submit sensitive,
confidential, or personal information to unpaid services. Paid services are not
used to improve Google products, but Google may retain prompts and responses
for a limited period for abuse monitoring and required legal or regulatory
disclosures. The terms also restrict API use in applications directed to, or
likely to be accessed by, people under 18. Recheck the
[current terms](https://ai.google.dev/gemini-api/terms) before launch. A paid
billing account alone does not resolve the intended-audience restriction.

The app currently has no age gate. Keep both Gemini flags disabled until the
owner confirms that the intended use and audience are eligible under the
provider terms, or decides and implements an appropriate audience restriction.
Do not treat these technical flags as consent or legal approval. See [Report
Privacy and AI Processing](PRIVACY_AND_AI.md).

## Incident-photo retention

Treat an empty retention setting as a production release blocker for any
deployment that accepts incident photos.

Set `INCIDENT_IMAGE_RETENTION_DAYS` in `backend/.env` to the
approved positive whole-number retention window. Leave it blank to keep automatic
deletion disabled. Once configured, the production Celery Beat service runs the
cleanup daily at 03:15 Asia/Manila. Beat also checks for stale analyses every
two minutes and retries queued image deletions every ten minutes. Run only one
Beat instance for this schedule.

The retention clock starts when a moderator changes a report to Approved,
Resolved, or Spam. Cleanup removes the photo from the live media volume only
after that period, and only when image analysis is no longer pending. It keeps
the report record and its other fields. Image deletion is queued after the
database transaction commits; failed storage deletions remain queued for retry.
Existing closed reports receive a `closed_at` timestamp during migration, so
their retention window starts when the migration is applied.

Set backup expiry to the same or a shorter period in the backup storage system.
The application cannot remove photos from archives created before cleanup.

## Backup and restore

Back up PostgreSQL and the `incident_media` volume together. Database backups
contain report metadata; media backups contain potentially sensitive photos.
Encrypt backups at rest, restrict access, and verify restore procedures in an
isolated environment before relying on them.

Deleting a report and expiring a retained photo queue live media deletion after
the database transaction commits. The queue keeps retrying until the media file
is deleted. Existing backups can still contain those images. Backup expiry and
incident-image retention therefore need to follow the same approved privacy
policy; the application does not prune backups.

Example PostgreSQL backup (run from the repository root with Compose
credentials configured):

```bash
mkdir -p backups
docker compose --env-file backend/.env exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backups/lockad-$(date +%F).dump"
```

Restore the database dump while the application services are stopped:

```bash
cat backups/lockad-YYYY-MM-DD.dump | docker compose --env-file backend/.env exec -T db \
  sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Archive the mounted media volume with a temporary container that shares the
backend's volumes:

```bash
docker run --rm --volumes-from "$(docker compose --env-file backend/.env ps -q backend)" \
  -v "$PWD/backups:/backup" alpine:3 \
  tar -czf "/backup/incident-media-$(date +%F).tar.gz" -C /app/media .
```

Restore the media archive into the Compose media volume with the backend and
worker stopped:

```bash
docker compose --env-file backend/.env run --rm --no-deps -v "$PWD/backups:/backup:ro" \
  --entrypoint sh backend -c \
  'tar -xzf /backup/incident-media-YYYY-MM-DD.tar.gz -C /app/media'
```

Then start the services and confirm readiness. Never restore production data
into a shared development environment.

## Migrations and rollback

The backend container applies migrations before it starts serving. The analysis
backfill marks existing non-empty AI summaries as completed. Existing closed
reports receive their retention start time when the migration runs. Treat
production schema changes as forward-only; restore a backup or ship a forward
fix instead of reversing a deployed schema change. Before rolling back the
image-deletion outbox migration, clear its pending jobs; the migration blocks
rollback while deletion jobs remain.

## Release checks

The GitHub Actions workflow validates local and production Compose
configuration, then runs Django system checks, backend tests, migration drift
checks, frontend lint, and a frontend production build. Backend checks use
PostgreSQL and Redis service containers. A green workflow does not replace a
production backup or a restore exercise.
