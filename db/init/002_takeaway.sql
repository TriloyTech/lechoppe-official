-- Migration 002: Takeaway Ordering System
-- Target: lechoppe-official PostgreSQL Database

BEGIN;

-- Existing catalog extensions. VAT remains unclassified until explicitly set,
-- and products remain ineligible until an administrator opts them in.
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS vat_rate numeric(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_quantity_per_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

ALTER TABLE menu_items
  ALTER COLUMN vat_rate DROP NOT NULL,
  ALTER COLUMN vat_rate DROP DEFAULT,
  ALTER COLUMN takeaway_available SET DEFAULT false;

-- This constraint also acts as the one-time marker for upgrading databases
-- that received the earlier unsafe Phase 1 defaults. Once present, rerunning
-- the migration does not erase later administrator configuration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_menu_items_takeaway_requires_vat'
      AND conrelid = 'menu_items'::regclass
  ) THEN
    UPDATE menu_items
    SET takeaway_available = false,
        vat_rate = NULL;

    UPDATE site_settings
    SET value = jsonb_set(value, '{takeaway_enabled}', 'false'::jsonb, true),
        updated_at = now()
    WHERE key = 'takeaway_settings';
  END IF;
END $$;

UPDATE menu_items
SET takeaway_available = false
WHERE takeaway_available IS NULL;

ALTER TABLE menu_items
  ALTER COLUMN takeaway_available SET NOT NULL;

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS takeaway_eligible boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_menu_items_vat_rate'
      AND conrelid = 'menu_items'::regclass
  ) THEN
    ALTER TABLE menu_items
      ADD CONSTRAINT chk_menu_items_vat_rate
      CHECK (vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate < 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_menu_items_max_quantity_per_order'
      AND conrelid = 'menu_items'::regclass
  ) THEN
    ALTER TABLE menu_items
      ADD CONSTRAINT chk_menu_items_max_quantity_per_order
      CHECK (max_quantity_per_order >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_menu_items_display_order'
      AND conrelid = 'menu_items'::regclass
  ) THEN
    ALTER TABLE menu_items
      ADD CONSTRAINT chk_menu_items_display_order
      CHECK (display_order >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_menu_items_takeaway_requires_vat'
      AND conrelid = 'menu_items'::regclass
  ) THEN
    ALTER TABLE menu_items
      ADD CONSTRAINT chk_menu_items_takeaway_requires_vat
      CHECK (NOT takeaway_available OR vat_rate IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS takeaway_option_groups (
  id uuid CONSTRAINT takeaway_option_groups_pkey PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL CONSTRAINT uq_takeaway_option_groups_key UNIQUE,
  name jsonb NOT NULL,
  selection_type text NOT NULL DEFAULT 'single',
  is_required boolean NOT NULL DEFAULT false,
  min_selections integer NOT NULL DEFAULT 0,
  max_selections integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_takeaway_option_groups_key CHECK (length(trim(key)) > 0),
  CONSTRAINT chk_takeaway_option_groups_name CHECK (
    jsonb_typeof(name) = 'object'
    AND name ?& ARRAY['fr', 'en', 'es', 'it']
  ),
  CONSTRAINT chk_takeaway_option_groups_selection_type CHECK (
    selection_type IN ('single', 'multiple')
  ),
  CONSTRAINT chk_takeaway_option_groups_selection_range CHECK (
    min_selections >= 0
    AND max_selections >= 1
    AND min_selections <= max_selections
  ),
  CONSTRAINT chk_takeaway_option_groups_single_limit CHECK (
    selection_type <> 'single' OR max_selections = 1
  ),
  CONSTRAINT chk_takeaway_option_groups_required_minimum CHECK (
    is_required = (min_selections > 0)
  ),
  CONSTRAINT chk_takeaway_option_groups_display_order CHECK (display_order >= 0)
);

CREATE TABLE IF NOT EXISTS takeaway_option_choices (
  id uuid CONSTRAINT takeaway_option_choices_pkey PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  name jsonb NOT NULL,
  price_modifier numeric(8,2) NOT NULL DEFAULT 0.00,
  vat_rate_override numeric(4,2) DEFAULT NULL,
  is_available boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_takeaway_option_choices_group
    FOREIGN KEY (group_id) REFERENCES takeaway_option_groups(id) ON DELETE CASCADE,
  CONSTRAINT chk_takeaway_option_choices_name CHECK (
    jsonb_typeof(name) = 'object'
    AND name ?& ARRAY['fr', 'en', 'es', 'it']
  ),
  CONSTRAINT chk_takeaway_option_choices_vat_rate_override CHECK (
    vat_rate_override IS NULL
    OR (vat_rate_override >= 0 AND vat_rate_override < 100)
  ),
  CONSTRAINT chk_takeaway_option_choices_display_order CHECK (display_order >= 0)
);

CREATE TABLE IF NOT EXISTS menu_item_option_groups (
  item_id uuid NOT NULL,
  group_id uuid NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  CONSTRAINT menu_item_option_groups_pkey PRIMARY KEY (item_id, group_id),
  CONSTRAINT fk_menu_item_option_groups_item
    FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_item_option_groups_group
    FOREIGN KEY (group_id) REFERENCES takeaway_option_groups(id) ON DELETE CASCADE,
  CONSTRAINT chk_menu_item_option_groups_display_order CHECK (display_order >= 0)
);

CREATE TABLE IF NOT EXISTS takeaway_orders (
  id uuid CONSTRAINT takeaway_orders_pkey PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference text NOT NULL CONSTRAINT uq_takeaway_orders_order_reference UNIQUE,
  tracking_token_hash text NOT NULL CONSTRAINT uq_takeaway_orders_tracking_token_hash UNIQUE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  pickup_time_type text NOT NULL,
  pickup_time timestamptz NOT NULL,
  customer_notes text DEFAULT NULL,
  status text NOT NULL DEFAULT 'NEW',
  payment_status text NOT NULL DEFAULT 'UNPAID',
  payment_method text DEFAULT NULL,
  subtotal_ttc numeric(8,2) NOT NULL DEFAULT 0.00,
  discount_ttc numeric(8,2) NOT NULL DEFAULT 0.00,
  promo_code text DEFAULT NULL,
  final_total_ttc numeric(8,2) NOT NULL DEFAULT 0.00,
  order_snapshot jsonb NOT NULL,
  cancellation_reason_code text DEFAULT NULL,
  cancellation_reason_label text DEFAULT NULL,
  cancellation_note text DEFAULT NULL,
  staff_notes text DEFAULT NULL,
  lang text NOT NULL DEFAULT 'fr',
  placed_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz DEFAULT NULL,
  preparing_at timestamptz DEFAULT NULL,
  ready_at timestamptz DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  cancelled_at timestamptz DEFAULT NULL,
  no_show_at timestamptz DEFAULT NULL,
  paid_at timestamptz DEFAULT NULL,
  CONSTRAINT chk_takeaway_orders_order_reference CHECK (length(trim(order_reference)) > 0),
  CONSTRAINT chk_takeaway_orders_tracking_token_hash CHECK (
    tracking_token_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT chk_takeaway_orders_pickup_time_type CHECK (
    pickup_time_type IN ('asap', 'scheduled')
  ),
  CONSTRAINT chk_takeaway_orders_status CHECK (
    status IN ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  CONSTRAINT chk_takeaway_orders_payment_status CHECK (
    payment_status IN ('UNPAID', 'PAID')
  ),
  CONSTRAINT chk_takeaway_orders_payment_method CHECK (
    payment_method IS NULL
    OR payment_method IN ('cash', 'card', 'ticket_restaurant', 'other')
  ),
  CONSTRAINT chk_takeaway_orders_payment_consistency CHECK (
    (payment_status = 'UNPAID' AND payment_method IS NULL AND paid_at IS NULL)
    OR
    (payment_status = 'PAID' AND payment_method IS NOT NULL AND paid_at IS NOT NULL)
  ),
  CONSTRAINT chk_takeaway_orders_terminal_timestamps CHECK (
    (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
    AND (status <> 'COMPLETED' OR completed_at IS NOT NULL)
  ),
  CONSTRAINT chk_takeaway_orders_other_cancellation_note CHECK (
    cancellation_reason_code IS DISTINCT FROM 'other'
    OR NULLIF(trim(cancellation_note), '') IS NOT NULL
  ),
  CONSTRAINT chk_takeaway_orders_amounts CHECK (
    subtotal_ttc >= 0 AND discount_ttc >= 0 AND final_total_ttc >= 0
  ),
  CONSTRAINT chk_takeaway_orders_snapshot CHECK (jsonb_typeof(order_snapshot) = 'object'),
  CONSTRAINT chk_takeaway_orders_lang CHECK (lang IN ('fr', 'en', 'es', 'it'))
);

CREATE TABLE IF NOT EXISTS takeaway_order_events (
  id uuid CONSTRAINT takeaway_order_events_pkey PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  event_type text NOT NULL,
  previous_status text DEFAULT NULL,
  new_status text NOT NULL,
  performed_by text NOT NULL,
  reason_code text DEFAULT NULL,
  note text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_takeaway_order_events_order
    FOREIGN KEY (order_id) REFERENCES takeaway_orders(id) ON DELETE RESTRICT,
  CONSTRAINT chk_takeaway_order_events_event_type CHECK (length(trim(event_type)) > 0),
  CONSTRAINT chk_takeaway_order_events_previous_status CHECK (
    previous_status IS NULL
    OR previous_status IN ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  CONSTRAINT chk_takeaway_order_events_new_status CHECK (
    new_status IN ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
  ),
  CONSTRAINT chk_takeaway_order_events_performed_by CHECK (
    performed_by IN ('customer', 'staff', 'system')
  )
);

-- Reconcile constraints for databases that already ran an earlier Phase 1
-- draft. Exact reruns remain no-ops once the corrected definitions exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_takeaway_orders_tracking_token_hash'
      AND conrelid = 'takeaway_orders'::regclass
      AND pg_get_constraintdef(oid) NOT LIKE '%[0-9a-f]{64}%'
  ) THEN
    ALTER TABLE takeaway_orders
      DROP CONSTRAINT chk_takeaway_orders_tracking_token_hash;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_takeaway_orders_tracking_token_hash'
      AND conrelid = 'takeaway_orders'::regclass
  ) THEN
    ALTER TABLE takeaway_orders
      ADD CONSTRAINT chk_takeaway_orders_tracking_token_hash
      CHECK (tracking_token_hash ~ '^[0-9a-f]{64}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_takeaway_orders_payment_consistency'
      AND conrelid = 'takeaway_orders'::regclass
  ) THEN
    ALTER TABLE takeaway_orders
      ADD CONSTRAINT chk_takeaway_orders_payment_consistency
      CHECK (
        (payment_status = 'UNPAID' AND payment_method IS NULL AND paid_at IS NULL)
        OR
        (payment_status = 'PAID' AND payment_method IS NOT NULL AND paid_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_takeaway_orders_terminal_timestamps'
      AND conrelid = 'takeaway_orders'::regclass
  ) THEN
    ALTER TABLE takeaway_orders
      ADD CONSTRAINT chk_takeaway_orders_terminal_timestamps
      CHECK (
        (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
        AND (status <> 'COMPLETED' OR completed_at IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_takeaway_orders_other_cancellation_note'
      AND conrelid = 'takeaway_orders'::regclass
  ) THEN
    ALTER TABLE takeaway_orders
      ADD CONSTRAINT chk_takeaway_orders_other_cancellation_note
      CHECK (
        cancellation_reason_code IS DISTINCT FROM 'other'
        OR NULLIF(trim(cancellation_note), '') IS NOT NULL
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_takeaway_order_events_order'
      AND conrelid = 'takeaway_order_events'::regclass
      AND pg_get_constraintdef(oid) LIKE '%ON DELETE CASCADE%'
  ) THEN
    ALTER TABLE takeaway_order_events
      DROP CONSTRAINT fk_takeaway_order_events_order;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_takeaway_order_events_order'
      AND conrelid = 'takeaway_order_events'::regclass
  ) THEN
    ALTER TABLE takeaway_order_events
      ADD CONSTRAINT fk_takeaway_order_events_order
      FOREIGN KEY (order_id) REFERENCES takeaway_orders(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION prevent_takeaway_order_snapshot_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.order_snapshot IS DISTINCT FROM OLD.order_snapshot THEN
    RAISE EXCEPTION 'takeaway order snapshots are immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_takeaway_order_snapshot ON takeaway_orders;
CREATE TRIGGER protect_takeaway_order_snapshot
  BEFORE UPDATE ON takeaway_orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_takeaway_order_snapshot_update();

CREATE OR REPLACE FUNCTION prevent_takeaway_order_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'takeaway order events are append-only'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_takeaway_order_events ON takeaway_order_events;
CREATE TRIGGER protect_takeaway_order_events
  BEFORE UPDATE OR DELETE ON takeaway_order_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_takeaway_order_event_mutation();

DROP TRIGGER IF EXISTS update_takeaway_option_groups_updated_at
  ON takeaway_option_groups;
CREATE TRIGGER update_takeaway_option_groups_updated_at
  BEFORE UPDATE ON takeaway_option_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_takeaway_option_choices_updated_at
  ON takeaway_option_choices;
CREATE TRIGGER update_takeaway_option_choices_updated_at
  BEFORE UPDATE ON takeaway_option_choices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Unique constraints already provide indexes for option-group keys, order
-- references, tracking hashes, and the menu-item side of the mapping PK.
CREATE INDEX IF NOT EXISTS idx_takeaway_option_choices_group
  ON takeaway_option_choices (group_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_option_groups_group
  ON menu_item_option_groups (group_id);
CREATE INDEX IF NOT EXISTS idx_takeaway_orders_status
  ON takeaway_orders (status);
CREATE INDEX IF NOT EXISTS idx_takeaway_orders_pickup_time
  ON takeaway_orders (pickup_time);
CREATE INDEX IF NOT EXISTS idx_takeaway_orders_placed_at
  ON takeaway_orders (placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_takeaway_order_events_order
  ON takeaway_order_events (order_id, created_at);

-- Standardize the approved shared category model without replacing existing
-- categories or labels. Missing translations use preservation-safe placeholders;
-- proper Spanish and Italian translations remain a Phase 2 activation task.
UPDATE site_settings AS settings
SET value = normalized.value,
    updated_at = now()
FROM (
  SELECT
    source.key,
    jsonb_agg(
      category.value || jsonb_build_object(
        'es', COALESCE(category.value->>'es', category.value->>'en', category.value->>'fr', ''),
        'it', COALESCE(category.value->>'it', category.value->>'en', category.value->>'fr', ''),
        'is_active', CASE
          WHEN jsonb_typeof(category.value->'is_active') = 'boolean'
            THEN category.value->'is_active'
          ELSE 'true'::jsonb
        END,
        'display_order', CASE
          WHEN jsonb_typeof(category.value->'display_order') = 'number'
            THEN category.value->'display_order'
          ELSE to_jsonb((category.ordinality - 1)::integer)
        END
      )
      ORDER BY category.ordinality
    ) AS value
  FROM site_settings AS source
  CROSS JOIN LATERAL jsonb_array_elements(source.value)
    WITH ORDINALITY AS category(value, ordinality)
  WHERE source.key = 'categories'
    AND jsonb_typeof(source.value) = 'array'
  GROUP BY source.key
) AS normalized
WHERE settings.key = normalized.key
  AND settings.value IS DISTINCT FROM normalized.value;

INSERT INTO site_settings (key, value) VALUES (
  'takeaway_settings',
  '{
    "takeaway_enabled": false,
    "pause_mode": false,
    "operating_hours": {
      "monday":    [{"open": "12:00", "close": "14:30"}, {"open": "19:00", "close": "22:30"}],
      "tuesday":   [{"open": "12:00", "close": "14:30"}, {"open": "19:00", "close": "22:30"}],
      "wednesday": [{"open": "12:00", "close": "14:30"}, {"open": "19:00", "close": "22:30"}],
      "thursday":  [{"open": "12:00", "close": "14:30"}, {"open": "19:00", "close": "22:30"}],
      "friday":    [{"open": "12:00", "close": "15:00"}, {"open": "19:00", "close": "23:00"}],
      "saturday":  [{"open": "12:00", "close": "15:00"}, {"open": "19:00", "close": "23:00"}],
      "sunday":    []
    },
    "closing_cutoff_minutes": 30,
    "prep_lead_time_minutes": 20,
    "slot_interval_minutes": 15,
    "advance_order_max_days": 0,
    "max_orders_per_slot": 0,
    "min_order_amount": 0.00,
    "max_order_amount": 0.00,
    "audio_alert_enabled": true,
    "accepted_payment_methods": ["cash", "card", "ticket_restaurant", "other"],
    "takeaway_promo_eligible": false
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

COMMIT;
