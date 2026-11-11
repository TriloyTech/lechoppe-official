-- 1. Create or replace the dispatch trigger function in schema lechoppe
CREATE OR REPLACE FUNCTION lechoppe.trigger_reservation_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://echoppedeparis.com/api/internal/reservations/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', 'YOUR_ADMIN_SESSION_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  RETURN NULL;
END;
$$;

-- 2. Create the statement trigger on lechoppe.reservation_notifications
DROP TRIGGER IF EXISTS trg_reservation_dispatch ON lechoppe.reservation_notifications;
CREATE TRIGGER trg_reservation_dispatch
AFTER INSERT ON lechoppe.reservation_notifications
FOR EACH STATEMENT
EXECUTE FUNCTION lechoppe.trigger_reservation_dispatch();

-- 3. Schedule pg_cron periodic retry sweeper every minute
DO $$
BEGIN
  PERFORM cron.unschedule('lechoppe-reservation-dispatch-sweep');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'lechoppe-reservation-dispatch-sweep',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://echoppedeparis.com/api/internal/reservations/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', 'YOUR_ADMIN_SESSION_SECRET_HERE'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
