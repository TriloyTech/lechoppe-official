-- Item-based Takeaway eligibility and the approved default-zero base item VAT.
-- This migration is intentionally rerunnable for already-initialized databases.
BEGIN;

UPDATE menu_items
SET vat_rate = 0.00
WHERE vat_rate IS NULL;

ALTER TABLE menu_items
  ALTER COLUMN vat_rate SET DEFAULT 0.00,
  ALTER COLUMN vat_rate SET NOT NULL;

ALTER TABLE menu_items
  DROP CONSTRAINT IF EXISTS chk_menu_items_takeaway_requires_vat,
  DROP CONSTRAINT IF EXISTS chk_menu_items_vat_rate;

ALTER TABLE menu_items
  ADD CONSTRAINT chk_menu_items_vat_rate
  CHECK (vat_rate >= 0 AND vat_rate < 100);

COMMIT;
