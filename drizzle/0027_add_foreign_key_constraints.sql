-- Add Foreign Key Constraints
-- Migration: 0027_add_foreign_key_constraints.sql

-- Note: SQLite requires recreating tables to add foreign keys
-- We'll use PRAGMA foreign_keys = ON to enforce constraints on new tables

-- Enable foreign keys enforcement
PRAGMA foreign_keys = ON;

-- Clean up orphaned records before adding FK constraints
DELETE FROM managers WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM contracts WHERE client_id NOT IN (SELECT id FROM users);
DELETE FROM contracts WHERE manager_id IS NOT NULL AND manager_id NOT IN (SELECT id FROM users);
DELETE FROM bookings WHERE client_id NOT IN (SELECT id FROM users);
DELETE FROM bookings WHERE manager_id IS NOT NULL AND manager_id NOT IN (SELECT id FROM users);
DELETE FROM payments WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users);
DELETE FROM company_cars WHERE company_id NOT IN (SELECT id FROM companies);
DELETE FROM contracts WHERE company_car_id NOT IN (SELECT id FROM company_cars);
DELETE FROM payments WHERE contract_id NOT IN (SELECT id FROM contracts);
DELETE FROM maintenance_history WHERE company_car_id NOT IN (SELECT id FROM company_cars);

-- 1. Companies table - add FK to users (owner_id)
CREATE TABLE companies_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    telegram TEXT,
    location_id INTEGER NOT NULL,
    district_id INTEGER NOT NULL,
    street TEXT NOT NULL,
    house_number TEXT NOT NULL,
    address TEXT,
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    swift_code TEXT,
    preparation_time INTEGER DEFAULT 30,
    delivery_fee_after_hours REAL DEFAULT 0,
    island_trip_price REAL,
    krabi_trip_price REAL,
    baby_seat_price_per_day REAL,
    weekly_schedule TEXT,
    holidays TEXT,
    settings TEXT,
    archived_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

INSERT INTO companies_new SELECT 
    id, name, owner_id, email, phone, telegram, location_id, district_id, 
    street, house_number, address, bank_name, account_number, account_name, 
    swift_code, preparation_time, delivery_fee_after_hours, island_trip_price, 
    krabi_trip_price, baby_seat_price_per_day, weekly_schedule, holidays, settings, 
    archived_at, 
    COALESCE(created_at, unixepoch('now')), 
    COALESCE(updated_at, unixepoch('now'))
FROM companies;
DROP TABLE companies;
ALTER TABLE companies_new RENAME TO companies;

-- Recreate indexes for companies
CREATE INDEX idx_companies_owner_id ON companies(owner_id);
CREATE INDEX idx_companies_location_id ON companies(location_id);
CREATE INDEX idx_companies_archived_at ON companies(archived_at);

-- 2. Managers table - add FKs to users and companies
CREATE TABLE managers_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    company_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

INSERT INTO managers_new SELECT 
    id, user_id, company_id, is_active,
    COALESCE(created_at, unixepoch('now')),
    COALESCE(updated_at, unixepoch('now'))
FROM managers;
DROP TABLE managers;
ALTER TABLE managers_new RENAME TO managers;

-- Recreate indexes for managers
CREATE INDEX idx_managers_user_id ON managers(user_id);
CREATE INDEX idx_managers_company_id ON managers(company_id);

-- 3. Company_cars table - add FKs to companies and car_templates
CREATE TABLE company_cars_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    template_id INTEGER,
    color_id INTEGER,
    license_plate TEXT NOT NULL,
    vin TEXT,
    year INTEGER,
    transmission TEXT,
    engine_volume REAL,
    fuel_type_id INTEGER,
    price_per_day REAL DEFAULT 0,
    deposit REAL DEFAULT 0,
    min_insurance_price REAL,
    max_insurance_price REAL,
    full_insurance_min_price REAL,
    full_insurance_max_price REAL,
    mileage INTEGER DEFAULT 0,
    next_oil_change_mileage INTEGER,
    oil_change_interval INTEGER DEFAULT 10000,
    insurance_expiry_date INTEGER,
    tax_road_expiry_date INTEGER,
    registration_expiry INTEGER,
    insurance_type TEXT,
    status TEXT DEFAULT 'available',
    photos TEXT,
    document_photos TEXT,
    green_book_photos TEXT,
    insurance_photos TEXT,
    tax_road_photos TEXT,
    description TEXT,
    marketing_headline TEXT,
    featured_image_index INTEGER DEFAULT 0,
    seasonal_prices TEXT,
    archived_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
    FOREIGN KEY (template_id) REFERENCES car_templates(id) ON DELETE SET NULL
);

INSERT INTO company_cars_new SELECT 
    id, company_id, template_id, color_id, license_plate, vin, year, transmission,
    engine_volume, fuel_type_id, price_per_day, deposit, min_insurance_price,
    max_insurance_price, full_insurance_min_price, full_insurance_max_price,
    mileage, next_oil_change_mileage, oil_change_interval, insurance_expiry_date,
    tax_road_expiry_date, registration_expiry, insurance_type, status, photos,
    document_photos, green_book_photos, insurance_photos, tax_road_photos,
    description, marketing_headline, featured_image_index, seasonal_prices,
    archived_at,
    COALESCE(created_at, unixepoch('now')),
    COALESCE(updated_at, unixepoch('now'))
FROM company_cars;
DROP TABLE company_cars;
ALTER TABLE company_cars_new RENAME TO company_cars;

-- Recreate indexes for company_cars
CREATE INDEX idx_company_cars_company_id ON company_cars(company_id);
CREATE INDEX idx_company_cars_status ON company_cars(status);
CREATE INDEX idx_cars_company_status ON company_cars(company_id, status);
CREATE INDEX idx_cars_template_company ON company_cars(template_id, company_id);

-- 4. Contracts table - add FKs to company_cars and users
CREATE TABLE contracts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    manager_id TEXT,
    booking_id INTEGER,
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    actual_end_date INTEGER,
    total_amount REAL NOT NULL,
    total_currency TEXT DEFAULT 'THB',
    deposit_amount REAL,
    deposit_currency TEXT DEFAULT 'THB',
    deposit_payment_method TEXT,
    full_insurance_enabled INTEGER DEFAULT 0,
    full_insurance_price REAL DEFAULT 0,
    baby_seat_enabled INTEGER DEFAULT 0,
    baby_seat_price REAL DEFAULT 0,
    island_trip_enabled INTEGER DEFAULT 0,
    island_trip_price REAL DEFAULT 0,
    krabi_trip_enabled INTEGER DEFAULT 0,
    krabi_trip_price REAL DEFAULT 0,
    pickup_district_id INTEGER,
    pickup_hotel TEXT,
    pickup_room TEXT,
    delivery_cost REAL DEFAULT 0,
    return_district_id INTEGER,
    return_hotel TEXT,
    return_room TEXT,
    return_cost REAL DEFAULT 0,
    start_mileage INTEGER,
    end_mileage INTEGER,
    fuel_level TEXT DEFAULT 'full',
    cleanliness TEXT DEFAULT 'clean',
    status TEXT DEFAULT 'active',
    photos TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (company_car_id) REFERENCES company_cars(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO contracts_new SELECT 
    id, company_car_id, client_id, manager_id, booking_id, start_date, end_date,
    actual_end_date, total_amount, total_currency, deposit_amount, deposit_currency,
    deposit_payment_method, full_insurance_enabled, full_insurance_price,
    baby_seat_enabled, baby_seat_price, island_trip_enabled, island_trip_price,
    krabi_trip_enabled, krabi_trip_price, pickup_district_id, pickup_hotel,
    pickup_room, delivery_cost, return_district_id, return_hotel, return_room,
    return_cost, start_mileage, end_mileage, fuel_level, cleanliness, status,
    photos, notes,
    COALESCE(created_at, unixepoch('now')),
    COALESCE(updated_at, unixepoch('now'))
FROM contracts;
DROP TABLE contracts;
ALTER TABLE contracts_new RENAME TO contracts;

-- Recreate indexes for contracts
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_company_car_id ON contracts(company_car_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_company_dates ON contracts(company_car_id, start_date, end_date);
CREATE INDEX idx_contracts_status_company ON contracts(status, company_car_id);

-- 5. Payments table - add FKs to contracts and users
CREATE TABLE payments_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    payment_type_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency_id INTEGER,
    currency TEXT DEFAULT 'THB',
    payment_method TEXT,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO payments_new SELECT 
    id, contract_id, payment_type_id, amount, currency_id, currency,
    payment_method, status, notes, created_by,
    COALESCE(created_at, unixepoch('now')),
    COALESCE(updated_at, unixepoch('now'))
FROM payments;
DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;

-- Recreate indexes for payments
CREATE INDEX idx_payments_contract_id ON payments(contract_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_status ON payments(status);

-- 6. Maintenance_history table - add FK to company_cars
CREATE TABLE maintenance_history_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    maintenance_type TEXT NOT NULL,
    mileage INTEGER,
    cost REAL,
    notes TEXT,
    performed_at INTEGER NOT NULL,
    performed_by TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (company_car_id) REFERENCES company_cars(id) ON DELETE CASCADE
);

INSERT INTO maintenance_history_new SELECT 
    id, company_car_id, maintenance_type, mileage, cost, notes,
    COALESCE(performed_at, unixepoch('now')),
    performed_by,
    COALESCE(created_at, unixepoch('now'))
FROM maintenance_history;
DROP TABLE maintenance_history;
ALTER TABLE maintenance_history_new RENAME TO maintenance_history;

-- Recreate indexes for maintenance_history
CREATE INDEX idx_maintenance_history_car_id ON maintenance_history(company_car_id);
CREATE INDEX idx_maintenance_history_performed_at ON maintenance_history(performed_at);
