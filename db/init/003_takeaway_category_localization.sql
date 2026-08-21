-- Versioned one-time localization of the Phase 1 preservation placeholders.
-- The marker makes later setup/migrate reruns strict no-ops, so an administrator
-- may intentionally use the same wording in two languages without overwrite.
BEGIN;

UPDATE site_settings AS settings
SET value = localized.value, updated_at = now()
FROM (
  SELECT source.key, jsonb_agg(
    category.value || jsonb_build_object(
      'es', CASE category.value->>'key'
        WHEN 'burger' THEN CASE WHEN category.value->>'es' IS NULL OR category.value->>'es' IN (category.value->>'en', category.value->>'fr') THEN 'Hamburguesas y platos' ELSE category.value->>'es' END
        WHEN 'side' THEN CASE WHEN category.value->>'es' IS NULL OR category.value->>'es' IN (category.value->>'en', category.value->>'fr') THEN 'Entrantes y guarniciones' ELSE category.value->>'es' END
        WHEN 'dessert' THEN CASE WHEN category.value->>'es' IS NULL OR category.value->>'es' IN (category.value->>'en', category.value->>'fr') THEN 'Postres' ELSE category.value->>'es' END
        WHEN 'drink' THEN CASE WHEN category.value->>'es' IS NULL OR category.value->>'es' IN (category.value->>'en', category.value->>'fr') THEN 'Bebidas' ELSE category.value->>'es' END
        ELSE COALESCE(category.value->>'es', category.value->>'en', category.value->>'fr', '') END,
      'it', CASE category.value->>'key'
        WHEN 'burger' THEN CASE WHEN category.value->>'it' IS NULL OR category.value->>'it' IN (category.value->>'en', category.value->>'fr') THEN 'Burger e piatti' ELSE category.value->>'it' END
        WHEN 'side' THEN CASE WHEN category.value->>'it' IS NULL OR category.value->>'it' IN (category.value->>'en', category.value->>'fr') THEN 'Antipasti e contorni' ELSE category.value->>'it' END
        WHEN 'dessert' THEN CASE WHEN category.value->>'it' IS NULL OR category.value->>'it' IN (category.value->>'en', category.value->>'fr') THEN 'Dolci' ELSE category.value->>'it' END
        WHEN 'drink' THEN CASE WHEN category.value->>'it' IS NULL OR category.value->>'it' IN (category.value->>'en', category.value->>'fr') THEN 'Bevande' ELSE category.value->>'it' END
        ELSE COALESCE(category.value->>'it', category.value->>'en', category.value->>'fr', '') END
    ) ORDER BY category.ordinality
  ) AS value
  FROM site_settings AS source
  CROSS JOIN LATERAL jsonb_array_elements(source.value) WITH ORDINALITY AS category(value, ordinality)
  WHERE source.key = 'categories' AND jsonb_typeof(source.value) = 'array'
  GROUP BY source.key
) AS localized
WHERE settings.key = localized.key
  AND settings.value IS DISTINCT FROM localized.value
  AND NOT EXISTS (SELECT 1 FROM site_settings marker WHERE marker.key = 'migration_takeaway_category_localization_v1');

INSERT INTO site_settings (key, value)
VALUES ('migration_takeaway_category_localization_v1', '{"applied": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
