-- Add standard template specification columns used in car templates Basic Information
ALTER TABLE car_templates ADD COLUMN drivetrain TEXT;
ALTER TABLE car_templates ADD COLUMN luggage_capacity TEXT;
ALTER TABLE car_templates ADD COLUMN rear_camera INTEGER NOT NULL DEFAULT 1;
ALTER TABLE car_templates ADD COLUMN infotainment TEXT;
ALTER TABLE car_templates ADD COLUMN bluetooth_enabled INTEGER NOT NULL DEFAULT 1;

-- Backfill defaults for existing rows
UPDATE car_templates
SET
  drivetrain = COALESCE(NULLIF(drivetrain, ''), 'FWD'),
  luggage_capacity = COALESCE(NULLIF(luggage_capacity, ''), 'medium'),
  infotainment = COALESCE(NULLIF(infotainment, ''), 'basic'),
  rear_camera = COALESCE(rear_camera, 1),
  bluetooth_enabled = COALESCE(bluetooth_enabled, 1)
WHERE 1 = 1;
