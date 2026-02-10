-- Fill only empty tables with test data

-- Hotels (empty)
INSERT OR IGNORE INTO hotels (id, name, location_id, district_id, address, created_at, updated_at) VALUES
(1, 'Patong Beach Hotel', 1, 1, '123 Beach Road, Patong', unixepoch(), unixepoch()),
(2, 'Kata Thani Resort', 1, 2, '14 Kata Noi Road, Kata', unixepoch(), unixepoch()),
(3, 'Karon Sea Sands Resort', 1, 3, '528 Patak Road, Karon', unixepoch(), unixepoch()),
(4, 'Rawai Palm Beach Resort', 1, 4, '88 Wiset Road, Rawai', unixepoch(), unixepoch()),
(5, 'Chalong Villa Resort', 1, 5, '45 Chao Fa Road, Chalong', unixepoch(), unixepoch());

-- Contracts (empty)
INSERT OR IGNORE INTO contracts (id, company_car_id, client_id, manager_id, booking_id, start_date, end_date, actual_end_date, total_amount, total_currency, deposit_amount, deposit_currency, deposit_payment_method, full_insurance_enabled, full_insurance_price, baby_seat_enabled, baby_seat_price, island_trip_enabled, island_trip_price, krabi_trip_enabled, krabi_trip_price, pickup_district_id, pickup_hotel, pickup_room, delivery_cost, return_district_id, return_hotel, return_room, return_cost, start_mileage, end_mileage, fuel_level, cleanliness, status, photos, notes, created_at, updated_at) VALUES
(1, 1, 'user-001', 'manager-001', NULL, unixepoch('2026-02-05'), unixepoch('2026-02-12'), NULL, 5600, 'THB', 3000, 'THB', 'cash', 0, 0, 0, 0, 0, 0, 0, 0, 1, 'Patong Beach Hotel', '305', 0, 1, 'Patong Beach Hotel', '305', 0, 5420, NULL, 'full', 'clean', 'active', '["contract1_1.jpg","contract1_2.jpg"]', 'Regular rental, no issues', unixepoch(), unixepoch()),
(2, 2, 'user-002', 'manager-001', NULL, unixepoch('2026-02-08'), unixepoch('2026-02-15'), unixepoch('2026-02-15'), 5600, 'THB', 3000, 'THB', 'bank_transfer', 1, 1050, 0, 0, 0, 0, 0, 0, 2, 'Kata Thani Resort', '412', 300, 2, 'Kata Thani Resort', '412', 300, 3200, 3700, 'full', 'clean', 'completed', '["contract2_1.jpg"]', 'Completed successfully', unixepoch(), unixepoch()),
(3, 3, 'user-003', 'manager-001', NULL, unixepoch('2026-02-10'), unixepoch('2026-02-20'), NULL, 35000, 'THB', 15000, 'THB', 'card', 1, 5000, 1, 3000, 1, 3000, 0, 0, 3, 'Karon Sea Sands Resort', '201', 250, 4, 'Rawai Palm Beach Resort', '105', 400, 45000, NULL, 'full', 'clean', 'active', '["contract3_1.jpg","contract3_2.jpg","contract3_3.jpg"]', 'Family trip with full insurance and baby seat', unixepoch(), unixepoch());

-- Payments (empty)
INSERT OR IGNORE INTO payments (id, contract_id, payment_type_id, amount, currency, payment_method, status, notes, created_by, created_at, updated_at) VALUES
(1, 1, 1, 5600, 'THB', 'cash', 'completed', 'Full rental payment', 'manager-001', unixepoch(), unixepoch()),
(2, 1, 2, 3000, 'THB', 'cash', 'completed', 'Security deposit', 'manager-001', unixepoch(), unixepoch()),
(3, 2, 1, 5600, 'THB', 'bank_transfer', 'completed', 'Rental + insurance payment', 'manager-001', unixepoch(), unixepoch()),
(4, 2, 2, 3000, 'THB', 'bank_transfer', 'completed', 'Security deposit', 'manager-001', unixepoch(), unixepoch()),
(5, 2, 3, 3000, 'THB', 'cash', 'completed', 'Deposit returned', 'manager-001', unixepoch(), unixepoch()),
(6, 3, 1, 35000, 'THB', 'card', 'completed', 'Full payment with extras', 'manager-001', unixepoch(), unixepoch()),
(7, 3, 2, 15000, 'THB', 'card', 'completed', 'Security deposit', 'manager-001', unixepoch(), unixepoch());

-- Maintenance History (empty)
INSERT OR IGNORE INTO maintenance_history (id, company_car_id, maintenance_type, mileage, cost, notes, performed_at, performed_by, created_at) VALUES
(1, 1, 'oil_change', 5000, 800, 'Regular oil change', unixepoch('2026-01-15'), 'manager-001', unixepoch()),
(2, 2, 'general_service', 3000, 1200, 'First service check', unixepoch('2026-01-20'), 'manager-001', unixepoch()),
(3, 3, 'oil_change', 40000, 1500, 'Oil and filter change', unixepoch('2026-01-10'), 'manager-001', unixepoch()),
(4, 3, 'tire_change', 45000, 8000, 'All four tires replaced', unixepoch('2026-01-25'), 'manager-001', unixepoch()),
(5, 4, 'brake_service', 25000, 3500, 'Brake pads replacement', unixepoch('2026-01-18'), 'manager-001', unixepoch());

-- Calendar Events (empty)
INSERT OR IGNORE INTO calendar_events (id, company_id, event_type, title, description, start_date, end_date, related_id, color, status, notification_sent, created_by, created_at, updated_at) VALUES
(1, 1, 'contract', 'Contract #1 - Honda PCX', 'Active rental for user-001', unixepoch('2026-02-05'), unixepoch('2026-02-12'), 1, '#3B82F6', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(2, 1, 'contract', 'Contract #3 - Toyota Fortuner', 'Active rental for user-003', unixepoch('2026-02-10'), unixepoch('2026-02-20'), 3, '#3B82F6', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(3, 1, 'maintenance', 'Oil Change - PCX #1', 'Scheduled oil change', unixepoch('2026-02-25'), NULL, 1, '#F59E0B', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(4, 1, 'document_expiry', 'Insurance Expiry - PCX #2', 'Insurance expires soon', unixepoch('2026-11-30'), NULL, 2, '#EF4444', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(5, 1, 'delivery', 'Delivery to Kata', 'Deliver car to Kata Thani Resort', unixepoch('2026-02-10'), NULL, 3, '#10B981', 'pending', 0, 'manager-001', unixepoch(), unixepoch()),
(6, 1, 'pickup', 'Pickup from Rawai', 'Pickup car from Rawai Palm Beach Resort', unixepoch('2026-02-20'), NULL, 3, '#10B981', 'pending', 0, 'manager-001', unixepoch(), unixepoch());

-- Audit Logs (empty)
INSERT OR IGNORE INTO audit_logs (id, user_id, role, company_id, entity_type, entity_id, action, before_state, after_state, ip_address, user_agent, created_at) VALUES
(1, 'manager-001', 'manager', 1, 'contract', 1, 'create', NULL, '{"id":1,"status":"active"}', '192.168.1.100', 'Mozilla/5.0', unixepoch()),
(2, 'manager-001', 'manager', 1, 'payment', 1, 'create', NULL, '{"id":1,"amount":5600}', '192.168.1.100', 'Mozilla/5.0', unixepoch()),
(3, 'manager-001', 'manager', 1, 'contract', 2, 'create', NULL, '{"id":2,"status":"active"}', '192.168.1.100', 'Mozilla/5.0', unixepoch()),
(4, 'manager-001', 'manager', 1, 'contract', 2, 'update', '{"status":"active"}', '{"status":"completed"}', '192.168.1.100', 'Mozilla/5.0', unixepoch()),
(5, 'partner-001', 'partner', 1, 'company_car', 1, 'update', '{"price_per_day":750}', '{"price_per_day":800}', '192.168.1.102', 'Mozilla/5.0', unixepoch()),
(6, 'admin-001', 'admin', NULL, 'user', 'user-003', 'view', NULL, NULL, '192.168.1.103', 'Mozilla/5.0', unixepoch());

-- Rental Durations (empty)
INSERT OR IGNORE INTO rental_durations (id, company_id, range_name, min_days, max_days, price_multiplier, discount_label, created_at, updated_at) VALUES
(1, 1, 'Daily', 1, 2, 1.0, NULL, unixepoch(), unixepoch()),
(2, 1, 'Short Term', 3, 6, 0.95, '5% off', unixepoch(), unixepoch()),
(3, 1, 'Weekly', 7, 13, 0.85, '15% off', unixepoch(), unixepoch()),
(4, 1, 'Bi-Weekly', 14, 20, 0.80, '20% off', unixepoch(), unixepoch()),
(5, 1, 'Monthly', 21, NULL, 0.70, '30% off', unixepoch(), unixepoch()),
(6, 2, 'Daily', 1, 3, 1.0, NULL, unixepoch(), unixepoch()),
(7, 2, 'Weekly', 4, 10, 0.90, '10% off', unixepoch(), unixepoch()),
(8, 2, 'Monthly', 11, NULL, 0.75, '25% off', unixepoch(), unixepoch());

-- Seasons (empty)
INSERT OR IGNORE INTO seasons (id, company_id, season_name, start_month, start_day, end_month, end_day, price_multiplier, discount_label, created_at, updated_at) VALUES
(1, 1, 'High Season', 11, 1, 3, 31, 1.5, 'Peak rates', unixepoch(), unixepoch()),
(2, 1, 'Shoulder Season', 4, 1, 5, 31, 1.2, 'Mid rates', unixepoch(), unixepoch()),
(3, 1, 'Low Season', 6, 1, 10, 31, 1.0, 'Best rates', unixepoch(), unixepoch()),
(4, 2, 'Peak Season', 12, 1, 2, 28, 1.6, 'Holiday rates', unixepoch(), unixepoch()),
(5, 2, 'Regular Season', 3, 1, 11, 30, 1.0, 'Standard rates', unixepoch(), unixepoch());
