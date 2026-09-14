# Reservation notifications

## Behavior

Public creation is exclusively `POST /api/reservations`. A successful response means the request was saved, not that a table is confirmed or an email delivered. Public requests are pending. One transaction saves the reservation, a received event, and separate customer/restaurant outbox jobs. Email failures cannot roll back an already saved reservation.

Authenticated lifecycle endpoint: `POST /api/admin/reservations/:id/status`, with `{status, reason}`. Only pending → confirmed, pending → cancelled (declined), and confirmed → cancelled are supported. Cancellation/decline requires a customer-facing reason of 1–1000 characters. Repeating the current status is a no-op. Row locks and unique event constraints prevent concurrent duplicates. Reservation deletion controls and generic mutations are disabled to preserve lifecycle and notification history; no editing/reopening endpoint was introduced.

The form captures French, English, Spanish, or Italian. Historical reservations default to French and receive no retrospective jobs. Validation follows the existing UI: 1–40 integer guests, today through 29 days ahead in Paris, listed half-hour lunch/dinner slots, name 120, email 254, optional phone 40, and notes 2000 characters. Customer notes are distinct from the customer-facing decline reason; no staff-note field is rendered. Dates are selected from SQL as text and rendered as Paris calendar dates, avoiding PostgreSQL date-to-JavaScript UTC shifts.

Submission keys are UUIDs, stable through network retries for unchanged form details. Explicit new submissions or changed details use a fresh key. PostgreSQL enforces unique submission keys and bot challenge IDs; an email-scoped advisory lock serializes the existing three-per-Paris-day quota. Exact saved retries bypass an expired bot challenge and temporal booking validation, but cannot change payload under the same key. Unsaved submissions still require the honeypot, elapsed-time check, and signed bot challenge. Idempotency state lasts while the form stays open; after closing/reloading, customers should contact the restaurant if the previous result is uncertain.

## Configuration & Gmail SMTP Setup

Email delivery uses **Gmail SMTP** via Nodemailer (`smtp.gmail.com`).

### 1. Creating a Dedicated Gmail Account
- For security, operational clarity, and separation of concerns, create a dedicated Google account exclusively for transactional restaurant email (e.g. `lechoppe.notifications@gmail.com` or a dedicated Google Workspace mailbox).
- Do **not** use a personal Google account for automated notification dispatch.

### 2. Enabling 2-Step Verification
1. Sign in to the dedicated Google account at [myaccount.google.com](https://myaccount.google.com).
2. Navigate to the **Security** tab on the left navigation panel.
3. Under "How you sign in to Google", select **2-Step Verification** and follow the prompts to complete setup.
4. 2-Step Verification must remain active; disabling it automatically revokes any generated App Passwords.

### 3. Creating a Google App Password
1. In the Google Account Security section, search for or select **App Passwords** (or visit [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
2. Under "App name", enter an identifiable label (e.g. `L'Échoppe SMTP Notification Worker`).
3. Click **Create**.
4. Google displays a 16-character generated password (e.g. `abcd efgh ijkl mnop`).
5. Copy this string without spaces.
6. **IMPORTANT**: **Never use or request the normal Google account password.** Only the dedicated 16-character App Password is used for SMTP authentication.

### 4. Server-Side Environment Variables

Configure these server-only variables for both the application container and the background reservation worker:

- `EMAIL_PROVIDER`: must be set to `gmail`.
- `GMAIL_SMTP_USER`: the dedicated Gmail address (e.g. `lechoppe.notifications@gmail.com`).
- `GMAIL_SMTP_APP_PASSWORD`: the 16-character Google App Password created above.
- `EMAIL_FROM`: the formatted sender address (e.g. `L'Échoppe <lechoppe.notifications@gmail.com>`). Note that Gmail SMTP requires the sender address to match the authenticated account or a configured "Send mail as" alias in Gmail settings.
- `DATABASE_URL`: self-hosted PostgreSQL connection string.
- `SITE_URL`: absolute HTTPS public application origin, used for the authenticated `/admin?reservation=...` link. Use an HTTP localhost origin only in local development.
- Existing `ADMIN_PASSPHRASE`, `ADMIN_SESSION_SECRET`, and bot challenge secret configuration continue to apply.

Never expose SMTP credentials through `NEXT_PUBLIC_*` variables, client bundles, server logs, API responses, admin settings, or database records.

### 5. Local Configuration
For local development and testing:
1. Copy `.env.example` to `.env`.
2. Populate `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, and `EMAIL_FROM`.
3. Set `SITE_URL=http://localhost:3000` (or your local port).
4. Run the local environment using Docker Compose:
   ```sh
   docker compose -f docker-compose.local.yml up -d
   ```
   Both the `lechoppe` application and the `reservation-worker` services receive the SMTP configuration and connect to the local PostgreSQL database service (`postgres`).

### 6. Production Configuration
In production:
1. Populate `.env` on the host with the production `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, `EMAIL_FROM`, and public `SITE_URL`.
2. The production `docker-compose.yml` injects these variables into both `lechoppe` and `reservation-worker` through the shared `env_file: - .env` directive.
3. Verify that file permissions on `.env` restrict access to the deployment operator (`chmod 600 .env`).

### 7. Admin Settings & Recipient Configuration
Admin → Settings → Reservation Notifications stores the restaurant recipient in the private `site_settings` key `reservation_notifications`. Saving requires an authenticated, same-origin session. Clearing and saving disables future restaurant email alerts. Neither the generic API nor public site settings expose this key.

### 8. Sending a Test Email
1. Log in to the admin panel at `/admin/login`.
2. Navigate to **Reservation Notifications** settings.
3. Verify that the restaurant recipient address is saved and that "Email provider configuration missing" is **not** displayed.
4. Click **Tester l’adresse enregistrée** (Test saved address).
5. The test email is sent directly via Gmail SMTP to the configured recipient address.
6. Rate limiting: test email attempts are throttled in PostgreSQL to at most one attempt per 60 seconds across all app processes.

### 9. Gmail Sending Limits & Operational Limitations
- **Volume limits**: Standard Gmail accounts are limited to **500 recipients/messages per rolling 24-hour window**. Google Workspace accounts are limited to **2,000 messages/day**.
- **Burst limits & connection concurrency**: Gmail SMTP enforces strict concurrency and burst rate limits. The reservation worker claims and delivers messages sequentially with a concurrency lease, preventing connection bursts.
- **Sender identity rewriting**: Unless a custom domain alias is explicitly verified under Gmail Settings → "Accounts and Import" → "Send mail as", Gmail automatically rewrites the `From:` header to match `GMAIL_SMTP_USER`.
- **App Password invalidation**: Changing the main Google account password or modifying 2-Step Verification settings immediately revokes all App Passwords, requiring a new password generation.
- **Monitoring & Spam Reputation**: If delivery errors occur frequently, Gmail may temporarily reject SMTP connections with a 4xx/5xx code (`provider_rejected` or `provider_auth_failed`).

## Worker and delivery semantics

Run the separate durable process with Node 22+:

```sh
npm run worker:reservations
# Standalone Docker image command:
node --experimental-strip-types lib/reservations/run.mjs
```

`docker-compose.yml` and `docker-compose.local.yml` include the `reservation-worker` service, using the same container image, environment file, network, and `restart: unless-stopped` supervision as the app. The Docker image copies the worker's TypeScript modules and `lib/email`; Nodemailer is included in the container dependencies.

For non-Compose deployments use a process supervisor (e.g. systemd) with automatic restart and a graceful SIGTERM timeout of at least 30 seconds. Do not run the worker as an HTTP request, browser callback, or serverless scheduled request. Monitor worker process liveness and database connectivity; its log messages contain no customer data or secrets.

The worker polls every two seconds when idle. It claims one due job atomically using `FOR UPDATE SKIP LOCKED`, commits a 60-second lease, attempt count, first-attempt time, and immutable sender before SMTP I/O. An expired lease is recoverable after a crash. A claim token fences obsolete workers. Delivery holds the reservation row lock, so status changes cannot race the final stale-message check. The SMTP connection timeout is 15 seconds.

Customer acknowledgments are superseded after the request leaves pending. Queued confirmations are superseded after cancellation. Restaurant alerts describe the original submission and link to current authenticated management; they do not offer unauthenticated actions.

There are at most six claims/attempts per job, with exponential retry delays starting at 30 seconds and capped at one hour. Database/crash failures count conservatively toward that limit. The provider idempotency header (`X-Entity-Ref-ID`) is the job UUID; recipient, rendered content, and sender stay fixed. Jobs are not automatically or manually re-sent after a conservative 23-hour window from their first attempt. This is **not exactly-once delivery**: a process can crash after acceptance but before recording the provider ID, and provider acceptance does not prove inbox delivery or ordering.

## Inspect and retry

The dashboard shows a notification-problem count. Settings lists the latest 50 problems, reservation links, audience, attempt count, and a localized explanation. The dedicated authenticated API also returns status, next retry time, and any provider message ID. Database states are `pending`, `processing`, `accepted`, `blocked`, `failed`, and `superseded`; `accepted` is intentionally not called `delivered`.

Provider statuses and errors reported in the admin UI are Gmail/SMTP-neutral:
- **Email provider configuration missing** (`provider_missing`): `EMAIL_PROVIDER`, `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, or `EMAIL_FROM` is missing or blank.
- **Authentication failed** (`provider_auth_failed`): Google rejected the credentials (invalid app password, revoked password, or 2SV change).
- **Connection timeout** (`provider_timeout`): SMTP connection to `smtp.gmail.com` timed out.
- **Message rejected** (`provider_rejected`): The SMTP server rejected the recipient address or content.
- **Delivery uncertain** (`provider_uncertain`): Unexpected network drop or connection reset during or following transmission.

Retry rules:
- Missing provider configuration blocks jobs and preserves the booking. Fix server configuration, restart the relevant processes, then retry eligible jobs in Settings.
- Missing recipient records a blocked restaurant job with a null snapshot. Configuring a recipient applies only to future jobs. These historical missing-recipient jobs cannot be redirected or retried; staff should follow up manually.
- Missing/invalid `SITE_URL` blocks the restaurant job because its management link was unavailable at creation. Correct it before new submissions.
- Retry preserves the original recipient and message. It only releases blocked/failed jobs below the six-attempt and 23-hour limits. Accepted, processing, pending, superseded, exhausted, and expired jobs cannot be manually duplicated through this endpoint.

## Validation

```sh
npx tsc --noEmit
npm run test:reservations
npm test
npm run build
git diff --check
# An explicitly disposable LOCAL database is required for integration tests; this suite never loads .env:
RESERVATION_TEST_DATABASE_URL=postgresql://user:password@127.0.0.1:5432/disposable npm run test:reservations:integration
```

Unit/route tests mock SMTP email delivery and database responses.
