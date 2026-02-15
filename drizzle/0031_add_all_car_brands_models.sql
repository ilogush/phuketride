-- Insert Honda brand (if not exists)
INSERT OR IGNORE INTO car_brands (name, created_at, updated_at) VALUES ('Honda', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Honda models
INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'City', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Honda';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'City Hatchback', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Honda';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Civic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Honda';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'HR-V', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Honda';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'CR-V', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Honda';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'BR-V', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Honda';

-- Insert Nissan brand (if not exists)
INSERT OR IGNORE INTO car_brands (name, created_at, updated_at) VALUES ('Nissan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Nissan models
INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Almera', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Nissan';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Kicks e-POWER', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Nissan';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Navara King Cab', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Nissan';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Navara Double Cab', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Nissan';

-- Insert Mitsubishi Motors brand (if not exists)
INSERT OR IGNORE INTO car_brands (name, created_at, updated_at) VALUES ('Mitsubishi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Mitsubishi models
INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Mirage', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mitsubishi';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Attrage', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mitsubishi';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Xpander', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mitsubishi';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Pajero Sport', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mitsubishi';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Triton Single Cab', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mitsubishi';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Triton Double Cab', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mitsubishi';

-- Insert Isuzu brand (if not exists)
INSERT OR IGNORE INTO car_brands (name, created_at, updated_at) VALUES ('Isuzu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Isuzu models
INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'D-Max Single Cab', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Isuzu';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'D-Max Space Cab', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Isuzu';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'D-Max Double Cab', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Isuzu';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'MU-X', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Isuzu';

-- Insert Mazda brand (if not exists)
INSERT OR IGNORE INTO car_brands (name, created_at, updated_at) VALUES ('Mazda', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Mazda models
INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Mazda2 Sedan', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mazda';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Mazda2 Hatchback', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mazda';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Mazda2', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mazda';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'BT-50 Double Cab', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Mazda';

-- Insert Suzuki brand (if not exists)
INSERT OR IGNORE INTO car_brands (name, created_at, updated_at) VALUES ('Suzuki', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Suzuki models
INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Celerio', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Suzuki';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Swift', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Suzuki';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Ciaz', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Suzuki';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'XL7', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Suzuki';

INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Ertiga', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Suzuki';

-- Insert Subaru brand (if not exists)
INSERT OR IGNORE INTO car_brands (name, created_at, updated_at) VALUES ('Subaru', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Subaru models
INSERT INTO car_models (brand_id, name, body_type_id, created_at, updated_at) 
SELECT id, 'Crosstrek (XV)', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM car_brands WHERE name = 'Subaru';

-- Insert Honda car templates
-- City 1.0L Turbo Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.0, 1, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'City';

-- City e:HEV 1.5L Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 3, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'City';

-- City Hatchback 1.0L Turbo Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.0, 1, 5, 5, 'automatic', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'City Hatchback';

-- City Hatchback e:HEV 1.5L Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 3, 5, 5, 'automatic', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'City Hatchback';

-- Civic 1.5L Turbo Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 1, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'Civic';

-- Civic e:HEV 2.0L Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 2.0, 3, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'Civic';

-- HR-V 1.5L Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 3, 5, 5, 'automatic', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'HR-V';

-- CR-V 1.5L Turbo Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 1, 5, 5, 'automatic', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'CR-V';

-- CR-V e:HEV 2.0L Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 2.0, 3, 5, 5, 'automatic', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'CR-V';

-- BR-V 1.5L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 1, 7, 5, 'automatic', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Honda' AND m.name = 'BR-V';

-- Insert Nissan car templates
-- Almera 1.0L Turbo Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.0, 1, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Nissan' AND m.name = 'Almera';

-- Kicks e-POWER 1.2L Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.2, 3, 5, 5, 'automatic', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Nissan' AND m.name = 'Kicks e-POWER';

-- Navara King Cab 2.3L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 2.3, 2, 2, 2, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Nissan' AND m.name = 'Navara King Cab';

-- Navara Double Cab 2.3L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 2.3, 2, 5, 4, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Nissan' AND m.name = 'Navara Double Cab';

-- Insert Mitsubishi car templates
-- Mirage 1.2L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.2, 1, 5, 5, 'automatic', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mitsubishi' AND m.name = 'Mirage';

-- Attrage 1.2L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.2, 1, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mitsubishi' AND m.name = 'Attrage';

-- Xpander 1.5L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 1, 7, 5, 'automatic', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mitsubishi' AND m.name = 'Xpander';

-- Xpander HEV 1.6L Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.6, 3, 7, 5, 'automatic', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mitsubishi' AND m.name = 'Xpander';

-- Pajero Sport 2.4L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 2.4, 2, 7, 5, 'automatic', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mitsubishi' AND m.name = 'Pajero Sport';

-- Triton Single Cab 2.4L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 2.4, 2, 2, 2, 'manual', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mitsubishi' AND m.name = 'Triton Single Cab';

-- Triton Double Cab 2.4L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 2.4, 2, 5, 4, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mitsubishi' AND m.name = 'Triton Double Cab';

-- Insert Isuzu car templates
-- D-Max Single Cab 1.9L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.9, 2, 2, 2, 'manual', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Isuzu' AND m.name = 'D-Max Single Cab';

-- D-Max Single Cab 3.0L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 3.0, 2, 2, 2, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Isuzu' AND m.name = 'D-Max Single Cab';

-- D-Max Space Cab 1.9L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.9, 2, 2, 2, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Isuzu' AND m.name = 'D-Max Space Cab';

-- D-Max Double Cab 1.9L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.9, 2, 5, 4, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Isuzu' AND m.name = 'D-Max Double Cab';

-- D-Max Double Cab 3.0L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 3.0, 2, 5, 4, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Isuzu' AND m.name = 'D-Max Double Cab';

-- MU-X 1.9L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.9, 2, 7, 5, 'automatic', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Isuzu' AND m.name = 'MU-X';

-- MU-X 3.0L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 3.0, 2, 7, 5, 'automatic', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Isuzu' AND m.name = 'MU-X';

-- Insert Mazda car templates
-- Mazda2 Sedan 1.3L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.3, 1, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mazda' AND m.name = 'Mazda2 Sedan';

-- Mazda2 Hatchback 1.3L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.3, 1, 5, 5, 'automatic', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mazda' AND m.name = 'Mazda2 Hatchback';

-- Mazda2 1.5L Diesel Sedan
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 2, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mazda' AND m.name = 'Mazda2';

-- Mazda2 1.5L Diesel Hatchback
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 2, 5, 5, 'automatic', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mazda' AND m.name = 'Mazda2';

-- BT-50 Double Cab 1.9L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.9, 2, 5, 4, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mazda' AND m.name = 'BT-50 Double Cab';

-- BT-50 Double Cab 3.0L Diesel
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 3.0, 2, 5, 4, 'automatic', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Mazda' AND m.name = 'BT-50 Double Cab';

-- Insert Suzuki car templates
-- Celerio 1.0L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.0, 1, 5, 5, 'automatic', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Suzuki' AND m.name = 'Celerio';

-- Swift 1.2L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.2, 1, 5, 5, 'automatic', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Suzuki' AND m.name = 'Swift';

-- Swift 1.2L Mild Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.2, 3, 5, 5, 'automatic', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Suzuki' AND m.name = 'Swift';

-- Ciaz 1.2L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.2, 1, 5, 4, 'automatic', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Suzuki' AND m.name = 'Ciaz';

-- XL7 1.5L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 1, 7, 5, 'automatic', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Suzuki' AND m.name = 'XL7';

-- Ertiga 1.5L Gasoline
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 1.5, 1, 7, 5, 'automatic', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Suzuki' AND m.name = 'Ertiga';

-- Insert Subaru car templates
-- Crosstrek (XV) 2.0L Hybrid
INSERT INTO car_templates (brand_id, model_id, engine_volume, fuel_type_id, seats, doors, transmission, body_type_id, created_at, updated_at)
SELECT b.id, m.id, 2.0, 3, 5, 5, 'automatic', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM car_brands b, car_models m WHERE b.name = 'Subaru' AND m.name = 'Crosstrek (XV)';
