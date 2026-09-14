# Reservation notifications

## Behavior

Public creation is exclusively `POST /api/reservations`. A successful response means the request was saved, not that a table is confirmed or an email delivered. Public requests are pending. One transaction saves the reservation, a received event, and separate customer/restaurant outbox jobs. Email failures cannot roll back an already saved reservation.

Authenticated lifecycle endpoint: `POST /api/admin/reservations/:id/status`, with `{status, reason}`. Only pending → confirmed, pending → cancelled (declined), and confirmed → cancelled are supported. Cancellation/decline requires a customer-facing reason of 1–1000 characters. Repeating the current status is a no-op. Row locks and unique event constraints prevent concurrent duplicates. Reservation deletion controls and generic mutations are disabled to preserve lifecycle and notification history; no editing/reopening endpoint was introduced.

The form captures French, English, Spanish, or Italian. Historical reservations default to French and receive no retrospective jobs. Validation follows the existing UI: 1–40 integer guests, today through 29 days ahead in Paris, listed half-hour lunch/dinner slots, name 120, email 254, optional phone 40, and notes 2000 characters. Customer notes are distinct from the customer-facing decline reason; no staff-note field is rendered. Dates are selected from SQL as text and rendered as Paris calendar dates, avoiding PostgreSQL date-to-JavaScript UTC shifts.

Submission keys are UUIDs, stable through network retries for unchanged form details. Explicit new submissions or changed details use a fresh key. PostgreSQL enforces unique submission keys and bot challenge IDs; an email-scoped advisory lock serializes the existing three-per-Paris-day quota. Exact saved retries bypass an expired bot challenge and temporal booking validation, but cannot change payload under the same key. Unsaved submissions still require the honeypot, elapsed-time check, and signed bot challenge. Idempotency state lasts while the form stays open; after closing/reloading, customers should contact the restaurant if the previous result is uncertain.

## Configuration

Server environment, shared by the app and worker:

- `DATABASE_URL`: self-hosted PostgreSQL.
- `RESEND_API_KEY`: server-only Resend sending key.
- `RESEND_FROM_EMAIL`: verified sender identity, for example `L'Échoppe <reservations@your-verified-domain.example>`. Reservation mail deliberately has no onboarding sender fallback.
- `SITE_URL`: absolute HTTPS public application origin, used for the authenticated `/admin?reservation=...` link. Use an HTTP localhost origin only in local development.
- Existing `ADMIN_PASSPHRASE`, `ADMIN_SESSION_SECRET`, and bot challenge secret configuration continue to apply.

Verify the sender domain and sender identity with Resend before rollout. Never put these variables in `NEXT_PUBLIC_*`, the admin UI, or source control. Restaurant contact details come from the existing `site_content` address/phone, falling back to the existing repository contact values.

Admin → Settings → Reservation Notifications stores one recipient in the private `site_settings` key `reservation_notifications`. Saving requires an authenticated, same-origin request. Clearing and saving disables future restaurant email alerts. Neither the generic API (including broad admin reads) nor public site settings expose or mutate this key. Outbox/event/test-limit tables are intentionally absent from generic database allowlists.

The test button targets only the saved recipient. Tests are limited in PostgreSQL to one attempt per minute across all app processes. Provider failures are reported; success means **accepted for sending**, not verified inbox delivery. Development validation uses mocks and must not press this button against a live configured provider without authorization.

## Worker and delivery semantics

Run the separate durable process with Node 22.6+:

```sh
npm run worker:reservations
# Standalone Docker image command:
node --experimental-strip-types lib/reservations/run.mjs
```

`docker-compose.yml` includes `reservation-worker`, using the same image, environment file, network, and `restart: unless-stopped` supervision as the app. The Docker image copies the worker's TypeScript modules and uses existing `pg`; no new dependencies are needed. For non-Compose deployments use a process supervisor with automatic restart and a graceful SIGTERM timeout of at least 30 seconds. Do not run the worker as an HTTP request, browser callback, or serverless scheduled request. Monitor worker process liveness and database connectivity; its log messages contain no customer data or secrets.

The worker polls every two seconds when idle. It claims one due job atomically using `FOR UPDATE SKIP LOCKED`, commits a 60-second lease, attempt count, first-attempt time, and immutable sender before network I/O. An expired lease is recoverable after a crash. A claim token fences obsolete workers. Delivery holds the reservation row lock, so status changes cannot race the final stale-message check. The HTTP timeout is 15 seconds. Multiple workers are supported, though one is sufficient initially; provider rate limits still apply.

Customer acknowledgments are superseded after the request leaves pending. Queued confirmations are superseded after cancellation. Restaurant alerts describe the original submission and link to current authenticated management; they do not offer unauthenticated actions.

There are at most six claims/attempts per job, with exponential retry delays starting at 30 seconds and capped at one hour. Database/crash failures count conservatively toward that limit. The provider idempotency key is the job UUID; recipient, rendered content, and sender stay fixed. Resend currently retains keys for [24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys). Jobs are not automatically or manually re-sent after a conservative 23-hour window from their first attempt. This is **not exactly-once delivery**: a process can crash after acceptance but before recording the provider ID, and provider acceptance does not prove inbox delivery or ordering. There is no webhook-based delivered/bounced state in this feature.

## Inspect and retry

The dashboard shows a notification-problem count. Settings lists the latest 50 problems, reservation links, audience, attempt count, and a localized explanation. The dedicated authenticated API also returns status, next retry time, and any provider message ID. Database states are `pending`, `processing`, `accepted`, `blocked`, `failed`, and `superseded`; `accepted` is intentionally not called `delivered`.

- Missing provider configuration blocks jobs and preserves the booking. Fix server configuration, restart the relevant processes, then retry eligible jobs in Settings.
- Missing recipient records a blocked restaurant job with a null snapshot. Configuring a recipient applies only to future jobs. These historical missing-recipient jobs cannot be redirected or retried; staff should follow up manually.
- Missing/invalid `SITE_URL` blocks the restaurant job because its management link was unavailable at creation. Correct it before new submissions. Existing linkless jobs remain blocked rather than sending incomplete alerts.
- Retry preserves the original recipient and message. It only releases blocked/failed jobs below the six-attempt and 23-hour limits. Accepted, processing, pending, superseded, exhausted, and expired jobs cannot be manually duplicated through this endpoint.
- On uncertain delivery or exhausted retries, inspect provider activity before manual contact. Do not change database job IDs or clear acceptance/idempotency metadata to force a send.

Dashboard polling runs every ten seconds across the active admin workspace without reloading menu data. Initial records are a baseline, including an empty baseline. New requests update the pending badge and show a link. Sound is opt-in, remembered in local storage, and coordinated with Web Locks where available. A browser's autoplay/storage policy may require enabling sound again. Polling stops on logout, unmount, or session expiry. Dashboard alerts require an open session; email delivery depends only on the worker.

## Existing deployment rollout (operator steps; not performed during development)

1. Back up the database and arrange a coordinated app/worker rollout. Do not start the worker against an unmigrated database.
2. Apply `db/init/006_reservation_notifications.sql` using the deployment's approved migration process. It is transactional and reapplicable. Existing setup/migrate routes also include it. It backfills language only; it does not create historical/demo notification events.
3. Configure the sender/key and `SITE_URL`, build the updated standalone image, and deploy the app. Keep new reservations temporarily paused operationally until recipient configuration is complete if restaurant alerts must exist from the first new request.
4. Save the restaurant recipient in Admin → Settings. Start the supervised worker with the same environment and database.
5. After explicit authorization, send a test through the admin panel and separately verify inbox receipt. Check worker liveness and the notification problem list.

## Validation

```sh
npx tsc --noEmit
npm run test:reservations
npm test
npm run build
# An explicitly disposable LOCAL database is required; this suite never loads .env:
RESERVATION_TEST_DATABASE_URL=postgresql://user:password@127.0.0.1:5432/disposable npm run test:reservations:integration
```

Unit/route tests mock email delivery and database responses. The PostgreSQL suite creates an isolated temporary schema, applies the migration twice, exercises concurrent submissions/status changes/worker claims, tests recipient snapshots and crash lease recovery, and removes only its test schema. A local database URL is mandatory to avoid accidentally testing against production.

Development results are recorded in `validation.md`. Production email delivery remains unverified unless a separately authorized live test is recorded there.
