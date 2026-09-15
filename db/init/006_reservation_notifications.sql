-- Safe to reapply. Historical and demo reservations deliberately produce no events.
BEGIN;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'fr';
UPDATE reservations SET lang = 'fr' WHERE lang NOT IN ('fr','en','es','it');
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS submission_key uuid;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS submission_hash text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS bot_challenge_id text;
CREATE UNIQUE INDEX IF NOT EXISTS reservations_bot_challenge_id ON reservations(bot_challenge_id);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_submission_key ON reservations(submission_key);
CREATE TABLE IF NOT EXISTS reservation_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reservation_id uuid NOT NULL REFERENCES reservations(id),
 kind text NOT NULL CHECK (kind IN ('received','confirmed','declined','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(reservation_id, kind)
);
CREATE TABLE IF NOT EXISTS reservation_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES reservation_events(id),
 audience text NOT NULL CHECK (audience IN ('customer','restaurant')),
 recipient text,
 payload jsonb NOT NULL,
 status text NOT NULL CHECK (status IN ('pending','processing','accepted','failed','blocked','superseded')),
 attempts int NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 claim_token uuid,
 first_attempt_at timestamptz,
 last_error text,
 provider_message_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(event_id, audience)
);
CREATE INDEX IF NOT EXISTS reservation_notifications_due ON reservation_notifications(status, next_attempt_at);
CREATE TABLE IF NOT EXISTS reservation_notification_test_limits (
 key text PRIMARY KEY,
 last_attempt_at timestamptz NOT NULL
);
COMMIT;
