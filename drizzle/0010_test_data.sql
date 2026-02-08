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
(1, 1, 1, 1, 'กข-1234', 'VIN001PCX160', 2023, 'automatic', 0.16, 'Petrol', 800, 3000, 100, 200, 150, 300, 5420, 15420, 10000, unixepoch('2026-12-31'), unixepoch('2026-12-31'), unixepoch('2027-06-30'), 'Third Party', 'available', '["car1_1.jpg","car1_2.jpg","car1_3.jpg"]', '["doc1.jpg"]', '["green1.jpg"]', '["ins1.jpg"]', '["tax1.jpg"]', 'Well maintained Honda PCX 160', 'Best scooter in Patong!', 0, '[{"seasonName":"High Season","startMonth":11,"endMonth":3,"priceMultiplier":1.3}]', NULL, unixepoch(), unixepoch()),
(2, 1, 1, 2, 'กข-5678', 'VIN002PCX160', 2023, 'automatic', 0.16, 'Petrol', 800, 3000, 100, 200, 150, 300, 3200, 13200, 10000, unixepoch('2026-11-30'), unixepoch('2026-11-30'), unixepoch('2027-05-31'), 'Third Party', 'available', '["car2_1.jpg","car2_2.jpg"]', '["doc2.jpg"]', '["green2.jpg"]', '["ins2.jpg"]', '["tax2.jpg"]', 'White Honda PCX 160 in excellent condition', 'Clean and reliable!', 0, '[]', NULL, unixepoch(), unixepoch()),
(3, 1, 2, 2, 'กค-9012', 'VIN003FORTUNER', 2022, 'automatic', 2.8, 'Diesel', 3500, 15000, 300, 500, 500, 800, 45000, 55000, 10000, unixepoch('2027-03-31'), unixepoch('2027-03-31'), unixepoch('2027-12-31'), 'Full Coverage', 'available', '["car3_1.jpg","car3_2.jpg","car3_3.jpg","car3_4.jpg"]', '["doc3.jpg"]', '["green3.jpg"]', '["ins3.jpg"]', '["tax3.jpg"]', 'Toyota Fortuner 2022 - Perfect for family trips', 'Luxury SUV for your vacation', 0, '[{"seasonName":"High Season","startMonth":11,"endMonth":3,"priceMultiplier":1.5}]', NULL, unixepoch(), unixepoch()),
(4, 1, 3, 5, 'กง-3456', 'VIN004YARIS', 2021, 'automatic', 1.5, 'Petrol', 1200, 5000, 150, 250, 200, 400, 28000, 38000, 10000, unixepoch('2026-10-31'), unixepoch('2026-10-31'), unixepoch('2027-04-30'), 'Third Party', 'rented', '["car4_1.jpg","car4_2.jpg"]', '["doc4.jpg"]', '["green4.jpg"]', '["ins4.jpg"]', '["tax4.jpg"]', 'Economical Toyota Yaris', 'Great fuel economy!', 0, '[]', NULL, unixepoch(), unixepoch()),
(5, 2, 4, 3, 'กจ-7890', 'VIN005NMAX', 2023, 'automatic', 0.155, 'Petrol', 850, 3500, 100, 200, 150, 300, 2100, 12100, 10000, unixepoch('2027-01-31'), unixepoch('2027-01-31'), unixepoch('2027-07-31'), 'Third Party', 'available', '["car5_1.jpg","car5_2.jpg","car5_3.jpg"]', '["doc5.jpg"]', '["green5.jpg"]', '["ins5.jpg"]', '["tax5.jpg"]', 'Sporty Yamaha NMAX', 'Feel the speed!', 0, '[{"seasonName":"High Season","startMonth":12,"endMonth":2,"priceMultiplier":1.2}]', NULL, unixepoch(), unixepoch()),
(6, 2, 2, 4, 'กฉ-1122', 'VIN006FORTUNER', 2022, 'automatic', 2.8, 'Diesel', 3800, 16000, 300, 500, 500, 800, 38000, 48000, 10000, unixepoch('2027-02-28'), unixepoch('2027-02-28'), unixepoch('2027-11-30'), 'Full Coverage', 'maintenance', '["car6_1.jpg","car6_2.jpg"]', '["doc6.jpg"]', '["green6.jpg"]', '["ins6.jpg"]', '["tax6.jpg"]', 'Blue Fortuner - Under maintenance', 'Premium SUV', 0, '[]', NULL, unixepoch(), unixepoch());

-- Contracts
INSERT INTO contracts (id, company_car_id, client_id, manager_id, booking_id, start_date, end_date, actual_end_date, total_amount, total_currency, deposit_amount, deposit_currency, deposit_payment_method, full_insurance_enabled, full_insurance_price, baby_seat_enabled, baby_seat_price, island_trip_enabled, island_trip_price, krabi_trip_enabled, krabi_trip_price, pickup_district_id, pickup_hotel, pickup_room, delivery_cost, return_district_id, return_hotel, return_room, return_cost, start_mileage, end_mileage, fuel_level, cleanliness, status, photos, notes, created_at, updated_at) VALUES
(1, 4, 'user-001', 'manager-001', NULL, unixepoch('2026-02-05'), unixepoch('2026-02-12'), NULL, 8400, 'THB', 5000, 'THB', 'cash', 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Patong Beach Hotel', '305', 0, 1, 'Patong Beach Hotel', '305', 0, 28000, NULL, 'full', 'clean', 'active', '["contract1_1.jpg","contract1_2.jpg"]', 'Regular rental, no issues', unixepoch(), unixepoch()),
(2, 1, 'user-002', 'manager-001', NULL, unixepoch('2026-02-08'), unixepoch('2026-02-15'), unixepoch('2026-02-15'), 5600, 'THB', 3000, 'THB', 'bank_transfer', 1, 1050, 0, 0, 0, 0, 0, 0, 2, 'Kata Thani Resort', '412', 300, 2, 'Kata Thani Resort', '412', 300, 5420, 5920, 'full', 'clean', 'completed', '["contract2_1.jpg"]', 'Completed successfully', unixepoch(), unixepoch()),
(3, 3, 'user-003', 'manager-001', NULL, unixepoch('2026-02-10'), unixepoch('2026-02-20'), NULL, 35000, 'THB', 15000, 'THB', 'card', 1, 5000, 1, 3000, 1, 3000, 0, 0, 3, 'Karon Sea Sands Resort', '201', 250, 4, 'Rawai Palm Beach Resort', '105', 400, 45000, NULL, 'full', 'clean', 'active', '["contract3_1.jpg","contract3_2.jpg","contract3_3.jpg"]', 'Family trip with full insurance and baby seat', unixepoch(), unixepoch()),
(4, 5, 'user-001', 'manager-002', NULL, unixepoch('2026-01-20'), unixepoch('2026-01-27'), unixepoch('2026-01-27'), 5950, 'THB', 3500, 'THB', 'cash', 0, 0, 0, 0, 0, 0, 0, 0, 2, 'Kata Thani Resort', '210', 300, 2, 'Kata Thani Resort', '210', 300, 2100, 2650, 'full', 'clean', 'completed', '["contract4_1.jpg"]', 'Smooth rental', unixepoch(), unixepoch());

-- Payment Types
INSERT INTO payment_types (id, name, sign, description, company_id, is_system, is_active, created_at, updated_at) VALUES
(1, 'Rental Payment', '+', 'Payment for car rental', NULL, 1, 1, unixepoch(), unixepoch()),
(2, 'Deposit', '+', 'Security deposit', NULL, 1, 1, unixepoch(), unixepoch()),
(3, 'Deposit Return', '-', 'Return of security deposit', NULL, 1, 1, unixepoch(), unixepoch()),
(4, 'Damage Fee', '+', 'Fee for vehicle damage', NULL, 1, 1, unixepoch(), unixepoch()),
(5, 'Late Return Fee', '+', 'Fee for late return', NULL, 1, 1, unixepoch(), unixepoch()),
(6, 'Fuel Charge', '+', 'Charge for missing fuel', NULL, 1, 1, unixepoch(), unixepoch()),
(7, 'Cleaning Fee', '+', 'Fee for dirty vehicle', NULL, 1, 1, unixepoch(), unixepoch()),
(8, 'Extra Service', '+', 'Additional services', 1, 0, 1, unixepoch(), unixepoch()),
(9, 'Discount', '-', 'Promotional discount', 1, 0, 1, unixepoch(), unixepoch());

-- Payments
INSERT INTO payments (id, contract_id, payment_type_id, amount, currency, payment_method, status, notes, created_by, created_at, updated_at) VALUES
(1, 1, 1, 8400, 'THB', 'cash', 'completed', 'Full rental payment', 'manager-001', unixepoch(), unixepoch()),
(2, 1, 2, 5000, 'THB', 'cash', 'completed', 'Security deposit', 'manager-001', unixepoch(), unixepoch()),
(3, 2, 1, 5600, 'THB', 'bank_transfer', 'completed', 'Rental + insurance payment', 'manager-001', unixepoch(), unixepoch()),
(4, 2, 2, 3000, 'THB', 'bank_transfer', 'completed', 'Security deposit', 'manager-001', unixepoch(), unixepoch()),
(5, 2, 3, 3000, 'THB', 'cash', 'completed', 'Deposit returned', 'manager-001', unixepoch(), unixepoch()),
(6, 3, 1, 35000, 'THB', 'card', 'completed', 'Full payment with extras', 'manager-001', unixepoch(), unixepoch()),
(7, 3, 2, 15000, 'THB', 'card', 'completed', 'Security deposit', 'manager-001', unixepoch(), unixepoch()),
(8, 4, 1, 5950, 'THB', 'cash', 'completed', 'Rental payment', 'manager-002', unixepoch(), unixepoch()),
(9, 4, 2, 3500, 'THB', 'cash', 'completed', 'Security deposit', 'manager-002', unixepoch(), unixepoch()),
(10, 4, 3, 3500, 'THB', 'cash', 'completed', 'Deposit returned', 'manager-002', unixepoch(), unixepoch());

-- Maintenance History
INSERT INTO maintenance_history (id, company_car_id, maintenance_type, mileage, cost, notes, performed_at, performed_by, created_at) VALUES
(1, 1, 'oil_change', 5000, 800, 'Regular oil change', unixepoch('2026-01-15'), 'manager-001', unixepoch()),
(2, 2, 'general_service', 3000, 1200, 'First service check', unixepoch('2026-01-20'), 'manager-001', unixepoch()),
(3, 3, 'oil_change', 40000, 1500, 'Oil and filter change', unixepoch('2026-01-10'), 'manager-001', unixepoch()),
(4, 3, 'tire_change', 45000, 8000, 'All four tires replaced', unixepoch('2026-01-25'), 'manager-001', unixepoch()),
(5, 4, 'brake_service', 25000, 3500, 'Brake pads replacement', unixepoch('2026-01-18'), 'manager-001', unixepoch()),
(6, 5, 'oil_change', 2000, 750, 'First oil change', unixepoch('2026-01-22'), 'manager-002', unixepoch()),
(7, 6, 'repair', 38000, 12000, 'Engine repair - currently in maintenance', unixepoch('2026-02-05'), 'manager-002', unixepoch());

-- Calendar Events
INSERT INTO calendar_events (id, company_id, event_type, title, description, start_date, end_date, related_id, color, status, notification_sent, created_by, created_at, updated_at) VALUES
(1, 1, 'contract', 'Contract #1 - Toyota Yaris', 'Active rental for user-001', unixepoch('2026-02-05'), unixepoch('2026-02-12'), 1, '#3B82F6', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(2, 1, 'contract', 'Contract #3 - Toyota Fortuner', 'Active rental for user-003', unixepoch('2026-02-10'), unixepoch('2026-02-20'), 3, '#3B82F6', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(3, 1, 'maintenance', 'Oil Change - PCX #1', 'Scheduled oil change', unixepoch('2026-02-25'), NULL, 1, '#F59E0B', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(4, 1, 'document_expiry', 'Insurance Expiry - Yaris', 'Insurance expires soon', unixepoch('2026-10-31'), NULL, 4, '#EF4444', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(5, 2, 'maintenance', 'Engine Repair - Fortuner #6', 'Ongoing engine repair', unixepoch('2026-02-05'), unixepoch('2026-02-15'), 6, '#F59E0B', 'pending', 0, 'manager-002', unixepoch(), unixepoch()),
(6, 2, 'meeting', 'Partner Meeting', 'Monthly review meeting', unixepoch('2026-02-15'), NULL, NULL, '#8B5CF6', 'pending', 0, 'partner-002', unixepoch(), unixepoch()),
(7, 1, 'delivery', 'Delivery to Kata', 'Deliver car to Kata Thani Resort', unixepoch('2026-02-10'), NULL, 3, '#10B981', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(8, 1, 'pickup', 'Pickup from Rawai', 'Pickup car from Rawai Palm Beach Resort', unixepoch('2026-02-20'), NULL, 3, '#10B981', 'pending', 0, 'manager-001', unixepoch(), unixepoch());

-- Audit Logs
INSERT INTO audit_logs (id, user_id, role, company_id, entity_type, entity_id, action, before_state, after_state, ip_address, user_agent, created_at) VALUES
(1, 'manager-001', 'manager', 1, 'contract', 1, 'create', NULL, '{"id":1,"status":"active"}', '192.168.1.100', 'Mozilla/5.0', unixepoch()),
(2, 'manager-001', 'manager', 1, 'payment', 1, 'create', NULL, '{"id":1,"amount":8400}', '192.168.1.100', 'Mozilla/5.0', unixepoch()),
(3, 'manager-001', 'manager', 1, 'contract', 2, 'create', NULL, '{"id":2,"status":"active"}', '192.168.1.100', 'Mozilla/5.0', unixepoch()),
(4, 'manager-001', 'manager', 1, 'contract', 2, 'update', '{"status":"active"}', '{"status":"completed"}', '192.168.1.100', 'Mozilla/5.0', unixepoch()),
(5, 'manager-002', 'manager', 2, 'maintenance_history', 7, 'create', NULL, '{"id":7,"type":"repair"}', '192.168.1.101', 'Mozilla/5.0', unixepoch()),
(6, 'partner-001', 'partner', 1, 'company_car', 1, 'update', '{"price_per_day":750}', '{"price_per_day":800}', '192.168.1.102', 'Mozilla/5.0', unixepoch()),
(7, 'admin-001', 'admin', NULL, 'user', 'user-003', 'view', NULL, NULL, '192.168.1.103', 'Mozilla/5.0', unixepoch());

-- Admin Settings
INSERT INTO admin_settings (id, key, value, description, created_at, updated_at) VALUES
(1, 'system_currency', '{"default":"THB","supported":["THB","USD","EUR","RUB"]}', 'System currency settings', unixepoch(), unixepoch()),
(2, 'email_notifications', '{"enabled":true,"smtp_host":"smtp.gmail.com","smtp_port":587}', 'Email notification configuration', unixepoch(), unixepoch()),
(3, 'booking_settings', '{"min_rental_days":1,"max_rental_days":90,"advance_booking_days":180}', 'Booking system settings', unixepoch(), unixepoch()),
(4, 'maintenance_reminders', '{"oil_change_threshold":500,"insurance_expiry_days":30,"tax_expiry_days":30}', 'Maintenance reminder thresholds', unixepoch(), unixepoch());

-- Rental Durations
INSERT INTO rental_durations (id, company_id, range_name, min_days, max_days, price_multiplier, discount_label, created_at, updated_at) VALUES
(1, 1, 'Daily', 1, 2, 1.0, NULL, unixepoch(), unixepoch()),
(2, 1, 'Short Term', 3, 6, 0.95, '5% off', unixepoch(), unixepoch()),
(3, 1, 'Weekly', 7, 13, 0.85, '15% off', unixepoch(), unixepoch()),
(4, 1, 'Bi-Weekly', 14, 20, 0.80, '20% off', unixepoch(), unixepoch()),
(5, 1, 'Monthly', 21, NULL, 0.70, '30% off', unixepoch(), unixepoch()),
(6, 2, 'Daily', 1, 3, 1.0, NULL, unixepoch(), unixepoch()),
(7, 2, 'Weekly', 4, 10, 0.90, '10% off', unixepoch(), unixepoch()),
(8, 2, 'Monthly', 11, NULL, 0.75, '25% off', unixepoch(), unixepoch());

-- Seasons
INSERT INTO seasons (id, company_id, season_name, start_month, start_day, end_month, end_day, price_multiplier, discount_label, created_at, updated_at) VALUES
(1, 1, 'High Season', 11, 1, 3, 31, 1.5, 'Peak rates', unixepoch(), unixepoch()),
(2, 1, 'Shoulder Season', 4, 1, 5, 31, 1.2, 'Mid rates', unixepoch(), unixepoch()),
(3, 1, 'Low Season', 6, 1, 10, 31, 1.0, 'Best rates', unixepoch(), unixepoch()),
(4, 2, 'Peak Season', 12, 1, 2, 28, 1.6, 'Holiday rates', unixepoch(), unixepoch()),
(5, 2, 'Regular Season', 3, 1, 11, 30, 1.0, 'Standard rates', unixepoch(), unixepoch());
