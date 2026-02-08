-- Test data for all tables
-- Run with: npm run db:migrate:local

-- Countries
INSERT INTO countries (id, name, code, created_at) VALUES
(1, 'Thailand', 'TH', unixepoch()),
(2, 'Russia', 'RU', unixepoch()),
(3, 'United States', 'US', unixepoch()),
(4, 'United Kingdom', 'GB', unixepoch()),
(5, 'Germany', 'DE', unixepoch());

-- Locations
INSERT INTO locations (id, name, country_id, created_at, updated_at) VALUES
(1, 'Phuket', 1, unixepoch(), unixepoch()),
(2, 'Bangkok', 1, unixepoch(), unixepoch()),
(3, 'Krabi', 1, unixepoch(), unixepoch());

-- Districts
INSERT INTO districts (id, name, location_id, beaches, streets, delivery_price, created_at, updated_at) VALUES
(1, 'Patong', 1, '["Patong Beach", "Paradise Beach"]', '["Rat-U-Thit Road", "Bangla Road", "Beach Road"]', 0, unixepoch(), unixepoch()),
(2, 'Kata', 1, '["Kata Beach", "Kata Noi Beach"]', '["Kata Road", "Patak Road"]', 300, unixepoch(), unixepoch()),
(3, 'Karon', 1, '["Karon Beach"]', '["Patak Road", "Karon Road"]', 250, unixepoch(), unixepoch()),
(4, 'Rawai', 1, '["Rawai Beach", "Nai Harn Beach"]', '["Wiset Road", "Sai Yuan Road"]', 400, unixepoch(), unixepoch()),
(5, 'Chalong', 1, '[]', '["Chao Fa Road", "Patak Road"]', 350, unixepoch(), unixepoch());

-- Hotels
INSERT INTO hotels (id, name, location_id, district_id, address, created_at, updated_at) VALUES
(1, 'Patong Beach Hotel', 1, 1, '123 Beach Road, Patong', unixepoch(), unixepoch()),
(2, 'Kata Thani Resort', 1, 2, '14 Kata Noi Road, Kata', unixepoch(), unixepoch()),
(3, 'Karon Sea Sands Resort', 1, 3, '528 Patak Road, Karon', unixepoch(), unixepoch()),
(4, 'Rawai Palm Beach Resort', 1, 4, '88 Wiset Road, Rawai', unixepoch(), unixepoch()),
(5, 'Chalong Villa Resort', 1, 5, '45 Chao Fa Road, Chalong', unixepoch(), unixepoch());

-- Users (admin, partner, manager, user)
INSERT INTO users (id, email, role, name, surname, phone, whatsapp, telegram, passport_number, citizenship, city, country_id, date_of_birth, gender, passport_photos, driver_license_photos, avatar_url, hotel_id, room_number, location_id, district_id, address, is_first_login, created_at, updated_at) VALUES
('admin-001', 'admin@phuketride.com', 'admin', 'John', 'Admin', '+66812345678', '+66812345678', '@johnadmin', 'A1234567', 'United States', 'Phuket', 3, unixepoch('2000-01-15'), 'male', '[]', '[]', NULL, NULL, NULL, 1, 1, '10 Admin Street, Patong', 0, unixepoch(), unixepoch()),
('partner-001', 'partner1@company.com', 'partner', 'Alex', 'Partner', '+66823456789', '+66823456789', '@alexpartner', 'P9876543', 'Thailand', 'Phuket', 1, unixepoch('1985-05-20'), 'male', '[]', '[]', NULL, NULL, NULL, 1, 1, '25 Business Road, Patong', 0, unixepoch(), unixepoch()),
('partner-002', 'partner2@company.com', 'partner', 'Maria', 'Ivanova', '+66834567890', '+66834567890', '@mariapartner', 'P1122334', 'Russia', 'Phuket', 2, unixepoch('1990-08-10'), 'female', '[]', '[]', NULL, NULL, NULL, 1, 2, '30 Kata Road, Kata', 0, unixepoch(), unixepoch()),
('manager-001', 'manager1@company.com', 'manager', 'Tom', 'Manager', '+66845678901', '+66845678901', '@tommanager', 'M5544332', 'Thailand', 'Phuket', 1, unixepoch('1992-03-25'), 'male', '[]', '[]', NULL, NULL, NULL, 1, 1, '15 Office Road, Patong', 0, unixepoch(), unixepoch()),
('manager-002', 'manager2@company.com', 'manager', 'Anna', 'Schmidt', '+66856789012', '+66856789012', '@annamanager', 'M7788990', 'Germany', 'Phuket', 5, unixepoch('1995-11-30'), 'female', '[]', '[]', NULL, NULL, NULL, 1, 3, '20 Karon Road, Karon', 0, unixepoch(), unixepoch()),
('user-001', 'user1@example.com', 'user', 'David', 'Smith', '+66867890123', '+66867890123', '@daviduser', 'U1234567', 'United Kingdom', 'London', 4, unixepoch('1988-07-12'), 'male', '["passport1.jpg", "passport2.jpg"]', '["license1.jpg", "license2.jpg"]', NULL, 1, '305', 1, 1, NULL, 0, unixepoch(), unixepoch()),
('user-002', 'user2@example.com', 'user', 'Emma', 'Johnson', '+66878901234', '+66878901234', '@emmauser', 'U7654321', 'United States', 'New York', 3, unixepoch('1993-02-18'), 'female', '["passport1.jpg", "passport2.jpg"]', '["license1.jpg"]', NULL, 2, '412', 1, 2, NULL, 0, unixepoch(), unixepoch()),
('user-003', 'user3@example.com', 'user', 'Igor', 'Petrov', '+66889012345', '+66889012345', '@igoruser', 'U9988776', 'Russia', 'Moscow', 2, unixepoch('1987-09-05'), 'male', '["passport1.jpg"]', '["license1.jpg", "license2.jpg"]', NULL, 3, '201', 1, 3, NULL, 1, unixepoch(), unixepoch());

-- Companies
INSERT INTO companies (id, name, owner_id, email, phone, telegram, location_id, district_id, street, house_number, address, bank_name, account_number, account_name, swift_code, preparation_time, delivery_fee_after_hours, island_trip_price, krabi_trip_price, baby_seat_price_per_day, weekly_schedule, holidays, settings, created_at, updated_at) VALUES
(1, 'Phuket Ride Company', 'partner-001', 'info@phuketride.com', '+66812345678', '@phuketride', 1, 1, 'Rat-U-Thit Road', '123', '123 Rat-U-Thit Road, Patong, Phuket', 'Bangkok Bank', '1234567890', 'Phuket Ride Company Ltd', 'BKKBTHBK', 30, 500, 3000, 5000, 300, '{"monday":{"open":true,"start":"08:00","end":"20:00"},"tuesday":{"open":true,"start":"08:00","end":"20:00"},"wednesday":{"open":true,"start":"08:00","end":"20:00"},"thursday":{"open":true,"start":"08:00","end":"20:00"},"friday":{"open":true,"start":"08:00","end":"20:00"},"saturday":{"open":true,"start":"09:00","end":"18:00"},"sunday":{"open":true,"start":"09:00","end":"18:00"}}', '["2026-01-01","2026-04-13","2026-04-14","2026-04-15","2026-12-25","2026-12-31"]', '{"defaultCurrency":"THB","timezone":"Asia/Bangkok"}', unixepoch(), unixepoch()),
(2, 'Kata Beach Rentals', 'partner-002', 'info@katarentals.com', '+66823456789', '@katarentals', 1, 2, 'Kata Road', '45', '45 Kata Road, Kata, Phuket', 'Kasikorn Bank', '9876543210', 'Kata Beach Rentals Co', 'KASITHBK', 45, 600, 3500, 5500, 350, '{"monday":{"open":true,"start":"08:30","end":"19:30"},"tuesday":{"open":true,"start":"08:30","end":"19:30"},"wednesday":{"open":true,"start":"08:30","end":"19:30"},"thursday":{"open":true,"start":"08:30","end":"19:30"},"friday":{"open":true,"start":"08:30","end":"19:30"},"saturday":{"open":true,"start":"09:00","end":"17:00"},"sunday":{"open":false,"start":"","end":""}}', '["2026-01-01","2026-12-25"]', '{"defaultCurrency":"THB","timezone":"Asia/Bangkok"}', unixepoch(), unixepoch());

-- Managers
INSERT INTO managers (id, user_id, company_id, is_active, created_at, updated_at) VALUES
(1, 'manager-001', 1, 1, unixepoch(), unixepoch()),
(2, 'manager-002', 2, 1, unixepoch(), unixepoch());

-- Car Brands
INSERT INTO car_brands (id, name, logo_url, created_at, updated_at) VALUES
(1, 'Honda', 'honda-logo.png', unixepoch(), unixepoch()),
(2, 'Toyota', 'toyota-logo.png', unixepoch(), unixepoch()),
(3, 'Yamaha', 'yamaha-logo.png', unixepoch(), unixepoch()),
(4, 'Mazda', 'mazda-logo.png', unixepoch(), unixepoch()),
(5, 'Isuzu', 'isuzu-logo.png', unixepoch(), unixepoch());

-- Car Models
INSERT INTO car_models (id, brand_id, name, body_type, created_at, updated_at) VALUES
(1, 1, 'PCX 160', 'Scooter', unixepoch(), unixepoch()),
(2, 1, 'Click 160i', 'Scooter', unixepoch(), unixepoch()),
(3, 2, 'Fortuner', 'SUV', unixepoch(), unixepoch()),
(4, 2, 'Yaris', 'Sedan', unixepoch(), unixepoch()),
(5, 3, 'NMAX', 'Scooter', unixepoch(), unixepoch()),
(6, 4, 'CX-5', 'SUV', unixepoch(), unixepoch()),
(7, 5, 'D-Max', 'Pickup', unixepoch(), unixepoch());

-- Colors
INSERT INTO colors (id, name, hex_code, created_at) VALUES
(1, 'Black', '#000000', unixepoch()),
(2, 'White', '#FFFFFF', unixepoch()),
(3, 'Red', '#FF0000', unixepoch()),
(4, 'Blue', '#0000FF', unixepoch()),
(5, 'Silver', '#C0C0C0', unixepoch()),
(6, 'Gray', '#808080', unixepoch());

-- Car Templates
INSERT INTO car_templates (id, brand_id, model_id, production_year, transmission, engine_volume, body_type, seats, doors, fuel_type, description, photos, created_at, updated_at) VALUES
(1, 1, 1, 2023, 'automatic', 0.16, 'Scooter', 2, 0, 'Petrol', 'Honda PCX 160 - Perfect for city rides', '["pcx1.jpg","pcx2.jpg","pcx3.jpg"]', unixepoch(), unixepoch()),
(2, 2, 3, 2022, 'automatic', 2.8, 'SUV', 7, 4, 'Diesel', 'Toyota Fortuner - Spacious family SUV', '["fortuner1.jpg","fortuner2.jpg","fortuner3.jpg"]', unixepoch(), unixepoch()),
(3, 2, 4, 2021, 'automatic', 1.5, 'Sedan', 5, 4, 'Petrol', 'Toyota Yaris - Economical city car', '["yaris1.jpg","yaris2.jpg"]', unixepoch(), unixepoch()),
(4, 3, 5, 2023, 'automatic', 0.155, 'Scooter', 2, 0, 'Petrol', 'Yamaha NMAX - Sporty scooter', '["nmax1.jpg","nmax2.jpg"]', unixepoch(), unixepoch());

-- Company Cars
INSERT INTO company_cars (id, company_id, template_id, color_id, license_plate, vin, year, transmission, engine_volume, fuel_type, price_per_day, deposit, min_insurance_price, max_insurance_price, full_insurance_min_price, full_insurance_max_price, mileage, next_oil_change_mileage, oil_change_interval, insurance_expiry_date, tax_road_expiry_date, registration_expiry, insurance_type, status, photos, document_photos, green_book_photos, insurance_photos, tax_road_photos, description, marketing_headline, featured_image_index, seasonal_prices, archived_at, created_at, updated_at) VALUES
