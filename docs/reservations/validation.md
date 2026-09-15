# Development validation — 2026-09-14

Branch: `feature/reservation-notifications`. Working tree clean. Resend was completely replaced with Gmail SMTP via Nodemailer. No live email sending was performed.

## Automated checks

- `npx tsc --noEmit`: passed with zero type errors.
- `npm run test:reservations`: 17 tests passed. Includes real route handlers compiled with mocked database, authorization/CSRF checks, generic API restrictions, transaction orchestration, idempotency, language/HTML/date handling, mocked SMTP provider outcomes (auth failure, timeout, message rejected, delivery uncertain, provider missing), worker retries/stale jobs, and dashboard arrival detection.
- `npm test`: all 25 takeaway tests passed (including SMTP order confirmation mock).
- `npm run build`: passed successfully in standalone mode.
- `git diff --check`: passed with zero whitespace or formatting issues.
- `npm run test:reservations:integration`: blocked/failed its environment precondition because `RESERVATION_TEST_DATABASE_URL` was not configured. No application `.env` database was used as a substitute.

Actual PostgreSQL execution against a live database remains unverified in this environment without a disposable database instance. The executable PostgreSQL integration suite is included for pre-rollout operator checks. Unit tests with scripted SQL responses do not substitute for that check.

## Browser QA

Browser plugin was not available; existing Playwright and installed Chrome were used, without adding dependencies. Local QA URL: `http://127.0.0.1:4333/admin`. Viewports: 1440×1000 and 390×844. QA server database access and email credentials were disabled, and browser API requests were mocked.

Passed:

- Correct admin URL/title, meaningful content, no framework error overlay, no admin console/page errors.
- Settings warning when recipient/provider configuration is missing.
- Save restaurant address and display saved feedback.
- Test button disabled without provider configuration; mocked acceptance feedback after enabling configuration.
- Initially empty reservation list; first arrival detected by automatic polling while Settings is selected.
- Arrival link opens the reservation, confirmation changes status, and cancellation requests a customer-facing reason and updates status.
- Repeated polls update reservation data without reloading menu data.
- Mobile settings render with no horizontal page overflow; screenshots visually inspected.
- Public mobile reservation steps submit language, UUID idempotency key, and honeypot field; promotion acknowledgment and final success screen clearly state that the request awaits confirmation.

Screenshots are local QA artifacts outside the repository:

- `/private/tmp/reservation-settings-desktop.png`
- `/private/tmp/reservation-settings-mobile.png`

The QA script is `/private/tmp/reservation-ui-qa.mjs`. Browser persistence is mocked, not proof of PostgreSQL persistence. Physical audio playback, multiple-browser sound coordination, live provider acceptance, inbox delivery, bounces, and delivery ordering were not verified.

Production email delivery remains unverified. No authorized live test was performed.

## Docker runtime smoke validation

After rebuilding the image without cache, verify the manually copied worker runtime can resolve its SMTP dependency from the final image:

```bash
docker compose -f docker-compose.local.yml run --rm --no-deps lechoppe \
  node --experimental-strip-types --input-type=module \
  -e "await import('nodemailer'); await import('./lib/email/reservation.ts'); console.log('reservation worker runtime imports: ok')"
docker compose -f docker-compose.local.yml ps lechoppe reservation-worker
```

The import command must print `reservation worker runtime imports: ok`, and the worker must remain `Up` rather than restarting.
