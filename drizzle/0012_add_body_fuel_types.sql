-- Create body_types table
CREATE TABLE IF NOT EXISTS body_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
);

-- Create fuel_types table
CREATE TABLE IF NOT EXISTS fuel_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
);

-- Seed body_types
INSERT INTO body_types (name, created_at) VALUES
    ('Sedan', unixepoch()),
    ('SUV', unixepoch()),
    ('Hatchback', unixepoch()),
    ('Coupe', unixepoch()),
    ('Convertible', unixepoch()),
    ('Wagon', unixepoch()),
    ('Van', unixepoch()),
    ('Pickup', unixepoch()),
    ('Minivan', unixepoch()),
    ('Crossover', unixepoch()),
    ('Scooter', unixepoch());

-- Seed fuel_types
INSERT INTO fuel_types (name, created_at) VALUES
    ('Petrol', unixepoch()),
    ('Diesel', unixepoch()),
    ('Electric', unixepoch()),
    ('Hybrid', unixepoch()),
    ('Plug-in Hybrid', unixepoch()),
    ('LPG', unixepoch()),
    ('CNG', unixepoch());

-- Add new columns to car_models
ALTER TABLE car_models ADD COLUMN body_type_id INTEGER;

-- Add new columns to car_templates
ALTER TABLE car_templates ADD COLUMN body_type_id INTEGER;
ALTER TABLE car_templates ADD COLUMN fuel_type_id INTEGER;

-- Add new column to company_cars
ALTER TABLE company_cars ADD COLUMN fuel_type_id INTEGER;

-- Migrate existing data from car_models
UPDATE car_models SET body_type_id = (
    SELECT id FROM body_types WHERE LOWER(body_types.name) = LOWER(car_models.body_type)
) WHERE car_models.body_type IS NOT NULL;

-- Migrate existing data from car_templates
UPDATE car_templates SET body_type_id = (
    SELECT id FROM body_types WHERE LOWER(body_types.name) = LOWER(car_templates.body_type)
) WHERE car_templates.body_type IS NOT NULL;

UPDATE car_templates SET fuel_type_id = (
    SELECT id FROM fuel_types WHERE LOWER(fuel_types.name) = LOWER(car_templates.fuel_type)
) WHERE car_templates.fuel_type IS NOT NULL;

-- Migrate existing data from company_cars
UPDATE company_cars SET fuel_type_id = (
    SELECT id FROM fuel_types WHERE LOWER(fuel_types.name) = LOWER(company_cars.fuel_type)
) WHERE company_cars.fuel_type IS NOT NULL;
