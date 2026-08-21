-- Review fixes: retain dedicated staff metadata and remove the obsolete global
-- promo flag. Offer-level offers.takeaway_eligible remains authoritative.
BEGIN;

ALTER TABLE takeaway_orders ADD COLUMN IF NOT EXISTS staff_notes text DEFAULT NULL;

UPDATE site_settings
SET value = value - 'takeaway_promo_eligible', updated_at = now()
WHERE key = 'takeaway_settings' AND value ? 'takeaway_promo_eligible';

COMMIT;
