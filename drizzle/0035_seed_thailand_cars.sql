-- Seed car brands and models for Thailand market
-- Body types: 1=Sedan, 2=SUV, 3=Hatchback, 7=Van, 8=Pickup, 9=Minivan
-- Fuel types: 1=Petrol, 2=Diesel, 4=Hybrid

-- Toyota
INSERT INTO car_brands (name, created_at, updated_at) VALUES ('Toyota', unixepoch(), unixepoch());
INSERT INTO car_models (name, brand_id, body_type_id, created_at, updated_at) VALUES
    ('Yaris ATIV', 1, 1, unixepoch(), unixepoch()),
    ('Yaris Hatchback', 1, 3, unixepoch(), unixepoch()),
    ('Corolla Altis', 1, 1, unixepoch(), unixepoch()),
    ('Corolla Cross', 1, 2, unixepoch(), unixepoch()),
    ('Camry', 1, 1, unixepoch(), unixepoch()),
    ('Hilux Revo Single Cab', 1, 8, unixepoch(), unixepoch()),
    ('Hilux Revo Double Cab', 1, 8, unixepoch(), unixepoch()),
    ('Fortuner', 1, 2, unixepoch(), unixepoch()),
    ('Veloz', 1, 9, unixepoch(), unixepoch()),
    ('Innova Zenix', 1, 9, unixepoch(), unixepoch()),
    ('Hiace Commuter', 1, 7, unixepoch(), unixepoch());

INSERT INTO car_templates (brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors, fuel_type_id, created_at, updated_at) VALUES
    (1, 1, 'automatic', 1.2, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (1, 1, 'automatic', 1.5, 1, 5, 4, 4, unixepoch(), unixepoch()),
    (1, 2, 'automatic', 1.2, 3, 5, 5, 1, unixepoch(), unixepoch()),
    (1, 3, 'automatic', 1.6, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (1, 3, 'automatic', 1.8, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (1, 3, 'automatic', 1.8, 1, 5, 4, 4, unixepoch(), unixepoch()),
    (1, 4, 'automatic', 1.8, 2, 5, 5, 1, unixepoch(), unixepoch()),
    (1, 4, 'automatic', 1.8, 2, 5, 5, 4, unixepoch(), unixepoch()),
    (1, 5, 'automatic', 2.5, 1, 5, 4, 4, unixepoch(), unixepoch()),
    (1, 6, 'manual', 2.4, 8, 2, 2, 2, unixepoch(), unixepoch()),
    (1, 7, 'automatic', 2.4, 8, 5, 4, 2, unixepoch(), unixepoch()),
    (1, 7, 'automatic', 2.8, 8, 5, 4, 2, unixepoch(), unixepoch()),
    (1, 8, 'automatic', 2.4, 2, 7, 5, 2, unixepoch(), unixepoch()),
    (1, 8, 'automatic', 2.8, 2, 7, 5, 2, unixepoch(), unixepoch()),
    (1, 9, 'automatic', 1.5, 9, 7, 5, 1, unixepoch(), unixepoch()),
    (1, 10, 'automatic', 2.0, 9, 7, 5, 1, unixepoch(), unixepoch()),
    (1, 10, 'automatic', 2.0, 9, 7, 5, 4, unixepoch(), unixepoch()),
    (1, 11, 'manual', 2.8, 7, 12, 4, 2, unixepoch(), unixepoch());

-- Honda
INSERT INTO car_brands (name, created_at, updated_at) VALUES ('Honda', unixepoch(), unixepoch());
INSERT INTO car_models (name, brand_id, body_type_id, created_at, updated_at) VALUES
    ('City', 2, 1, unixepoch(), unixepoch()),
    ('City Hatchback', 2, 3, unixepoch(), unixepoch()),
    ('Civic', 2, 1, unixepoch(), unixepoch()),
    ('HR-V', 2, 2, unixepoch(), unixepoch()),
    ('CR-V', 2, 2, unixepoch(), unixepoch()),
    ('BR-V', 2, 9, unixepoch(), unixepoch());

INSERT INTO car_templates (brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors, fuel_type_id, created_at, updated_at) VALUES
    (2, 12, 'automatic', 1.0, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (2, 12, 'automatic', 1.5, 1, 5, 4, 4, unixepoch(), unixepoch()),
    (2, 13, 'automatic', 1.0, 3, 5, 5, 1, unixepoch(), unixepoch()),
    (2, 14, 'automatic', 1.5, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (2, 14, 'automatic', 2.0, 1, 5, 4, 4, unixepoch(), unixepoch()),
    (2, 15, 'automatic', 1.5, 2, 5, 5, 4, unixepoch(), unixepoch()),
    (2, 16, 'automatic', 1.5, 2, 5, 5, 1, unixepoch(), unixepoch()),
    (2, 16, 'automatic', 2.0, 2, 5, 5, 4, unixepoch(), unixepoch()),
    (2, 17, 'automatic', 1.5, 9, 7, 5, 1, unixepoch(), unixepoch());

-- Nissan
INSERT INTO car_brands (name, created_at, updated_at) VALUES ('Nissan', unixepoch(), unixepoch());
INSERT INTO car_models (name, brand_id, body_type_id, created_at, updated_at) VALUES
    ('Almera', 3, 1, unixepoch(), unixepoch()),
    ('Kicks', 3, 2, unixepoch(), unixepoch()),
    ('Navara Double Cab', 3, 8, unixepoch(), unixepoch());

INSERT INTO car_templates (brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors, fuel_type_id, created_at, updated_at) VALUES
    (3, 18, 'automatic', 1.0, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (3, 19, 'automatic', 1.2, 2, 5, 5, 4, unixepoch(), unixepoch()),
    (3, 20, 'automatic', 2.3, 8, 5, 4, 2, unixepoch(), unixepoch());

-- Mitsubishi
INSERT INTO car_brands (name, created_at, updated_at) VALUES ('Mitsubishi', unixepoch(), unixepoch());
INSERT INTO car_models (name, brand_id, body_type_id, created_at, updated_at) VALUES
    ('Mirage', 4, 3, unixepoch(), unixepoch()),
    ('Attrage', 4, 1, unixepoch(), unixepoch()),
    ('Xpander', 4, 9, unixepoch(), unixepoch()),
    ('Pajero Sport', 4, 2, unixepoch(), unixepoch()),
    ('Triton Double Cab', 4, 8, unixepoch(), unixepoch());

INSERT INTO car_templates (brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors, fuel_type_id, created_at, updated_at) VALUES
    (4, 21, 'automatic', 1.2, 3, 5, 5, 1, unixepoch(), unixepoch()),
    (4, 22, 'automatic', 1.2, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (4, 23, 'automatic', 1.5, 9, 7, 5, 1, unixepoch(), unixepoch()),
    (4, 23, 'automatic', 1.6, 9, 7, 5, 4, unixepoch(), unixepoch()),
    (4, 24, 'automatic', 2.4, 2, 7, 5, 2, unixepoch(), unixepoch()),
    (4, 25, 'automatic', 2.4, 8, 5, 4, 2, unixepoch(), unixepoch());

-- Isuzu
INSERT INTO car_brands (name, created_at, updated_at) VALUES ('Isuzu', unixepoch(), unixepoch());
INSERT INTO car_models (name, brand_id, body_type_id, created_at, updated_at) VALUES
    ('D-Max Single Cab', 5, 8, unixepoch(), unixepoch()),
    ('D-Max Double Cab', 5, 8, unixepoch(), unixepoch()),
    ('MU-X', 5, 2, unixepoch(), unixepoch());

INSERT INTO car_templates (brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors, fuel_type_id, created_at, updated_at) VALUES
    (5, 26, 'manual', 1.9, 8, 2, 2, 2, unixepoch(), unixepoch()),
    (5, 27, 'automatic', 1.9, 8, 5, 4, 2, unixepoch(), unixepoch()),
    (5, 27, 'automatic', 3.0, 8, 5, 4, 2, unixepoch(), unixepoch()),
    (5, 28, 'automatic', 1.9, 2, 7, 5, 2, unixepoch(), unixepoch()),
    (5, 28, 'automatic', 3.0, 2, 7, 5, 2, unixepoch(), unixepoch());

-- Mazda
INSERT INTO car_brands (name, created_at, updated_at) VALUES ('Mazda', unixepoch(), unixepoch());
INSERT INTO car_models (name, brand_id, body_type_id, created_at, updated_at) VALUES
    ('Mazda2 Sedan', 6, 1, unixepoch(), unixepoch()),
    ('Mazda2 Hatchback', 6, 3, unixepoch(), unixepoch()),
    ('Mazda2', 6, 3, unixepoch(), unixepoch()),
    ('BT-50 Double Cab', 6, 8, unixepoch(), unixepoch());

INSERT INTO car_templates (brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors, fuel_type_id, created_at, updated_at) VALUES
    (6, 29, 'automatic', 1.3, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (6, 30, 'automatic', 1.3, 3, 5, 5, 1, unixepoch(), unixepoch()),
    (6, 31, 'automatic', 1.5, 3, 5, 5, 2, unixepoch(), unixepoch()),
    (6, 32, 'automatic', 1.9, 8, 5, 4, 2, unixepoch(), unixepoch()),
    (6, 32, 'automatic', 3.0, 8, 5, 4, 2, unixepoch(), unixepoch());

-- Suzuki
INSERT INTO car_brands (name, created_at, updated_at) VALUES ('Suzuki', unixepoch(), unixepoch());
INSERT INTO car_models (name, brand_id, body_type_id, created_at, updated_at) VALUES
    ('Celerio', 7, 3, unixepoch(), unixepoch()),
    ('Swift', 7, 3, unixepoch(), unixepoch()),
    ('Ciaz', 7, 1, unixepoch(), unixepoch()),
    ('XL7', 7, 9, unixepoch(), unixepoch()),
    ('Ertiga', 7, 9, unixepoch(), unixepoch());

INSERT INTO car_templates (brand_id, model_id, transmission, engine_volume, body_type_id, seats, doors, fuel_type_id, created_at, updated_at) VALUES
    (7, 33, 'automatic', 1.0, 3, 5, 5, 1, unixepoch(), unixepoch()),
    (7, 34, 'automatic', 1.2, 3, 5, 5, 1, unixepoch(), unixepoch()),
    (7, 35, 'automatic', 1.2, 1, 5, 4, 1, unixepoch(), unixepoch()),
    (7, 36, 'automatic', 1.5, 9, 7, 5, 1, unixepoch(), unixepoch()),
    (7, 37, 'automatic', 1.5, 9, 7, 5, 1, unixepoch(), unixepoch());
