-- Add separate feature flags for smartphone integrations in car templates
ALTER TABLE car_templates ADD COLUMN carplay_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE car_templates ADD COLUMN android_auto_enabled INTEGER NOT NULL DEFAULT 0;

-- Backfill from legacy infotainment column when present
UPDATE car_templates
SET
  carplay_enabled = CASE
    WHEN LOWER(COALESCE(infotainment, '')) LIKE '%carplay%' THEN 1
    ELSE COALESCE(carplay_enabled, 0)
  END,
  android_auto_enabled = CASE
    WHEN LOWER(COALESCE(infotainment, '')) LIKE '%android_auto%' OR LOWER(COALESCE(infotainment, '')) LIKE '%android auto%' THEN 1
    ELSE COALESCE(android_auto_enabled, 0)
  END
WHERE 1 = 1;
