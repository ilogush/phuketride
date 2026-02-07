-- Seed data for phuketride-bd database
-- Test users for each role with simple passwords

-- Insert countries
INSERT OR IGNORE INTO countries (id, name, code, created_at) VALUES
(1, 'Thailand', 'TH', unixepoch()),
(2, 'Russia', 'RU', unixepoch()),
(3, 'USA', 'US', unixepoch());

-- Insert locations
INSERT OR IGNORE INTO locations (id, name, country_id, created_at, updated_at) VALUES
(1, 'Phuket', 1, unixepoch(), unixepoch()),
(2, 'Bangkok', 1, unixepoch(), unixepoch()),
(3, 'Krabi', 1, unixepoch(), unixepoch());

-- Insert districts for Phuket
INSERT OR IGNORE INTO districts (id, name, location_id, delivery_price, created_at, updated_at) VALUES
(1, 'Patong', 1, 500, unixepoch(), unixepoch()),
(2, 'Kata', 1, 700, unixepoch(), unixepoch()),
(3, 'Karon', 1, 700, unixepoch(), unixepoch()),
(4, 'Rawai', 1, 800, unixepoch(), unixepoch()),
(5, 'Chalong', 1, 600, unixepoch(), unixepoch()),
(6, 'Phuket Town', 1, 400, unixepoch(), unixepoch());

-- Insert car brands
INSERT OR IGNORE INTO car_brands (id, name, logo_url, created_at, updated_at) VALUES
(1, 'Honda', NULL, unixepoch(), unixepoch()),
(2, 'Toyota', NULL, unixepoch(), unixepoch()),
(3, 'Yamaha', NULL, unixepoch(), unixepoch()),
(4, 'Suzuki', NULL, unixepoch(), unixepoch());

-- Insert car models
INSERT OR IGNORE INTO car_models (id, brand_id, name, body_type, created_at, updated_at) VALUES
(1, 1, 'PCX 160', 'scooter', unixepoch(), unixepoch()),
(2, 1, 'Click 160', 'scooter', unixepoch(), unixepoch()),
(3, 2, 'Fortuner', 'suv', unixepoch(), unixepoch()),
(4, 3, 'Aerox 155', 'scooter', unixepoch(), unixepoch());

-- Insert colors
INSERT OR IGNORE INTO colors (id, name, hex_code, created_at) VALUES
(1, 'Black', '#000000', unixepoch()),
(2, 'White', '#FFFFFF', unixepoch()),
(3, 'Red', '#FF0000', unixepoch()),
(4, 'Blue', '#0000FF', unixepoch()),
(5, 'Silver', '#C0C0C0', unixepoch());

-- Insert car templates
INSERT OR IGNORE INTO car_templates (id, brand_id, model_id, production_year, transmission, engine_volume, body_type, seats, doors, fuel_type, description, photos, created_at, updated_at) VALUES
(1, 1, 1, 2023, 'automatic', 0.16, 'scooter', 2, 0, 'petrol', 'Honda PCX 160 - comfortable city scooter', '[]', unixepoch(), unixepoch()),
(2, 2, 3, 2022, 'automatic', 2.8, 'suv', 7, 4, 'diesel', 'Toyota Fortuner - spacious family SUV', '[]', unixepoch(), unixepoch());

-- Insert test users
-- Password for admin (ilogush@icloud.com): "220232", others: "password123" (in real app, this should be hashed)
INSERT OR IGNORE INTO users (id, email, role, name, surname, phone, whatsapp, telegram, citizenship, city, country_id, gender, is_first_login, created_at, updated_at) VALUES
('admin-001', 'ilogush@icloud.com', 'admin', 'Admin', 'User', '+66812345001', '+66812345001', 'admin_pr', 'Thailand', 'Phuket', 1, 'male', 0, unixepoch(), unixepoch()),
('partner-001', 'partner@phuketride.com', 'partner', 'John', 'Partner', '+66812345002', '+66812345002', 'john_partner', 'Russia', 'Moscow', 2, 'male', 0, unixepoch(), unixepoch()),
('partner-002', 'partner2@phuketride.com', 'partner', 'Maria', 'Partner', '+66812345003', '+66812345003', 'maria_partner', 'USA', 'New York', 3, 'female', 0, unixepoch(), unixepoch()),
('manager-001', 'manager@phuketride.com', 'manager', 'Mike', 'Manager', '+66812345004', '+66812345004', 'mike_manager', 'Thailand', 'Phuket', 1, 'male', 0, unixepoch(), unixepoch()),
('user-001', 'user@phuketride.com', 'user', 'Alice', 'Client', '+66812345005', '+66812345005', 'alice_client', 'Russia', 'Saint Petersburg', 2, 'female', 0, unixepoch(), unixepoch());

-- Insert test companies
INSERT OR IGNORE INTO companies (id, name, owner_id, email, phone, telegram, location_id, district_id, street, house_number, address, island_trip_price, krabi_trip_price, baby_seat_price_per_day, settings, created_at, updated_at) VALUES
(1, 'Phuket Ride Co.', 'partner-001', 'info@phuketride.com', '+66812345002', 'phuketride_official', 1, 1, 'Beach Road', '123', 'Near Patong Beach', 1500, 2000, 200, '{"default_currency":"THB","min_rental_days":1,"active_currencies":["THB","USD","EUR"]}', unixepoch(), unixepoch()),
(2, 'Island Wheels', 'partner-002', 'info@islandwheels.com', '+66812345003', 'islandwheels', 1, 4, 'Rawai Beach Road', '456', 'Rawai Beach Area', 1800, 2200, 250, '{"default_currency":"THB","min_rental_days":1,"active_currencies":["THB","USD"]}', unixepoch(), unixepoch());

-- Insert manager relationship
INSERT OR IGNORE INTO managers (id, user_id, company_id, is_active, created_at, updated_at) VALUES
(1, 'manager-001', 1, 1, unixepoch(), unixepoch());

-- Insert company cars
INSERT OR IGNORE INTO company_cars (id, company_id, template_id, color_id, license_plate, year, transmission, engine_volume, fuel_type, price_per_day, deposit, min_insurance_price, max_insurance_price, mileage, oil_change_interval, status, photos, description, marketing_headline, seasonal_prices, created_at, updated_at) VALUES
(1, 1, 1, 1, 'กข-1234', 2023, 'automatic', 0.16, 'petrol', 400, 3000, 100, 200, 5000, 10000, 'available', '[]', 'Honda PCX 160 in excellent condition', 'Perfect for city rides', '[]', unixepoch(), unixepoch()),
(2, 1, 1, 2, 'กข-5678', 2023, 'automatic', 0.16, 'petrol', 400, 3000, 100, 200, 3000, 10000, 'available', '[]', 'Honda PCX 160 white color', 'Comfortable and reliable', '[]', unixepoch(), unixepoch()),
(3, 1, 2, 5, 'กข-9012', 2022, 'automatic', 2.8, 'diesel', 2500, 15000, 500, 1000, 45000, 10000, 'available', '[]', 'Toyota Fortuner for family trips', 'Spacious 7-seater SUV', '[]', unixepoch(), unixepoch()),
(4, 2, 1, 3, 'กค-1111', 2023, 'automatic', 0.16, 'petrol', 450, 3000, 100, 200, 2000, 10000, 'available', '[]', 'Red Honda PCX 160', 'Stylish red scooter', '[]', unixepoch(), unixepoch());

-- Insert payment types (system types)
INSERT OR IGNORE INTO payment_types (id, name, sign, description, company_id, is_system, is_active, created_at, updated_at) VALUES
(1, 'Deposit', '+', 'Security deposit payment', NULL, 1, 1, unixepoch(), unixepoch()),
(2, 'Rental Fee', '+', 'Rental payment', NULL, 1, 1, unixepoch(), unixepoch()),
(3, 'Deposit Return', '-', 'Return of security deposit', NULL, 1, 1, unixepoch(), unixepoch()),
(4, 'Fine', '+', 'Fine payment', NULL, 1, 1, unixepoch(), unixepoch()),
(5, 'Cleaning', '+', 'Cleaning fee', NULL, 1, 1, unixepoch(), unixepoch()),
(6, 'Fuel', '+', 'Fuel charge', NULL, 1, 1, unixepoch(), unixepoch()),
(7, 'Damage', '+', 'Damage repair cost', NULL, 1, 1, unixepoch(), unixepoch()),
(8, 'Excess Mileage', '+', 'Excess mileage charge', NULL, 1, 1, unixepoch(), unixepoch()),
(9, 'Partner Payout', '-', 'Payment to partner', NULL, 1, 1, unixepoch(), unixepoch());

-- Insert admin settings
INSERT OR IGNORE INTO admin_settings (id, key, value, description, created_at, updated_at) VALUES
(1, 'default_seasons', '[{"name":"Low Season","start_month":5,"start_day":1,"end_month":10,"end_day":31,"multiplier":0.8},{"name":"High Season","start_month":11,"start_day":1,"end_month":4,"end_day":30,"multiplier":1.2}]', 'Default seasonal pricing template', unixepoch(), unixepoch()),
(2, 'default_duration_ranges', '[{"min_days":1,"max_days":2,"multiplier":1.0},{"min_days":3,"max_days":6,"multiplier":0.95},{"min_days":7,"max_days":13,"multiplier":0.9},{"min_days":14,"max_days":29,"multiplier":0.85},{"min_days":30,"max_days":null,"multiplier":0.8}]', 'Default duration pricing template', unixepoch(), unixepoch());
