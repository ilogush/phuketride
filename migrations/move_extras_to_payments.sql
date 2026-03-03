-- Migration: Move extras fields from contracts to payments
-- Date: 2026-03-04

-- This migration moves extra services (insurance, baby seat, trips) from contracts table to payments table
-- Each extra will be stored as a separate payment record

PRAGMA foreign_keys = OFF;

-- Step 1: Add extras-related columns to payments table
-- Create new payments table with extras columns
CREATE TABLE payments_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER,
    payment_type_id INTEGER,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'THB',
    currency_id INTEGER,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- New extras fields
    extra_type TEXT CHECK(extra_type IN ('full_insurance', 'baby_seat', 'island_trip', 'krabi_trip', NULL)),
    extra_enabled INTEGER DEFAULT 0,
    extra_price REAL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (payment_type_id) REFERENCES payment_types(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Step 2: Copy existing payments data
INSERT INTO payments_new (
    id, contract_id, payment_type_id, amount, currency, currency_id,
    payment_method, status, notes, created_by, created_at, updated_at
)
SELECT 
    id, contract_id, payment_type_id, amount, currency, currency_id,
    payment_method, status, notes, created_by, created_at, updated_at
FROM payments;

-- Step 3: Drop old payments table
DROP TABLE payments;

-- Step 4: Rename new table
ALTER TABLE payments_new RENAME TO payments;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type_id ON payments(payment_type_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_extra_type ON payments(extra_type);

-- Step 6: Migrate extras data from contracts to payments
-- Note: This will create payment records for each enabled extra
-- We'll use payment_type_id = 1 (assuming it's a rental payment type)
-- You may need to adjust this based on your payment_types table

-- Insert full insurance payments
INSERT INTO payments (
    contract_id, payment_type_id, amount, currency, payment_method, status,
    notes, created_by, created_at, updated_at,
    extra_type, extra_enabled, extra_price
)
SELECT 
    id as contract_id,
    1 as payment_type_id,
    full_insurance_price as amount,
    'THB' as currency,
    'cash' as payment_method,
    'completed' as status,
    'Full Insurance (migrated from contract)' as notes,
    manager_id as created_by,
    created_at,
    updated_at,
    'full_insurance' as extra_type,
    1 as extra_enabled,
    full_insurance_price as extra_price
FROM contracts
WHERE full_insurance_enabled = 1 AND full_insurance_price > 0;

-- Insert baby seat payments
INSERT INTO payments (
    contract_id, payment_type_id, amount, currency, payment_method, status,
    notes, created_by, created_at, updated_at,
    extra_type, extra_enabled, extra_price
)
SELECT 
    id as contract_id,
    1 as payment_type_id,
    baby_seat_price as amount,
    'THB' as currency,
    'cash' as payment_method,
    'completed' as status,
    'Baby Seat (migrated from contract)' as notes,
    manager_id as created_by,
    created_at,
    updated_at,
    'baby_seat' as extra_type,
    1 as extra_enabled,
    baby_seat_price as extra_price
FROM contracts
WHERE baby_seat_enabled = 1 AND baby_seat_price > 0;

-- Insert island trip payments
INSERT INTO payments (
    contract_id, payment_type_id, amount, currency, payment_method, status,
    notes, created_by, created_at, updated_at,
    extra_type, extra_enabled, extra_price
)
SELECT 
    id as contract_id,
    1 as payment_type_id,
    island_trip_price as amount,
    'THB' as currency,
    'cash' as payment_method,
    'completed' as status,
    'Island Trip (migrated from contract)' as notes,
    manager_id as created_by,
    created_at,
    updated_at,
    'island_trip' as extra_type,
    1 as extra_enabled,
    island_trip_price as extra_price
FROM contracts
WHERE island_trip_enabled = 1 AND island_trip_price > 0;

-- Insert krabi trip payments
INSERT INTO payments (
    contract_id, payment_type_id, amount, currency, payment_method, status,
    notes, created_by, created_at, updated_at,
    extra_type, extra_enabled, extra_price
)
SELECT 
    id as contract_id,
    1 as payment_type_id,
    krabi_trip_price as amount,
    'THB' as currency,
    'cash' as payment_method,
    'completed' as status,
    'Krabi Trip (migrated from contract)' as notes,
    manager_id as created_by,
    created_at,
    updated_at,
    'krabi_trip' as extra_type,
    1 as extra_enabled,
    krabi_trip_price as extra_price
FROM contracts
WHERE krabi_trip_enabled = 1 AND krabi_trip_price > 0;

-- Step 7: Remove extras columns from contracts table
CREATE TABLE contracts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    client_id TEXT,
    manager_id TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    actual_end_date TEXT,
    total_amount REAL,
    total_currency TEXT DEFAULT 'THB',
    deposit_amount REAL,
    deposit_currency TEXT DEFAULT 'THB',
    deposit_payment_method TEXT,
    pickup_district_id INTEGER,
    pickup_hotel TEXT,
    pickup_room TEXT,
    delivery_cost REAL,
    return_district_id INTEGER,
    return_hotel TEXT,
    return_room TEXT,
    return_cost REAL,
    start_mileage INTEGER,
    end_mileage INTEGER,
    fuel_level TEXT,
    cleanliness TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    photos TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_car_id) REFERENCES company_cars(id),
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (manager_id) REFERENCES users(id),
    FOREIGN KEY (pickup_district_id) REFERENCES districts(id),
    FOREIGN KEY (return_district_id) REFERENCES districts(id)
);

-- Copy contracts data (excluding extras fields)
INSERT INTO contracts_new (
    id, company_car_id, client_id, manager_id, start_date, end_date, actual_end_date,
    total_amount, total_currency, deposit_amount, deposit_currency, deposit_payment_method,
    pickup_district_id, pickup_hotel, pickup_room, delivery_cost,
    return_district_id, return_hotel, return_room, return_cost,
    start_mileage, end_mileage, fuel_level, cleanliness, status, notes, photos,
    created_at, updated_at
)
SELECT 
    id, company_car_id, client_id, manager_id, start_date, end_date, actual_end_date,
    total_amount, total_currency, deposit_amount, deposit_currency, deposit_payment_method,
    pickup_district_id, pickup_hotel, pickup_room, delivery_cost,
    return_district_id, return_hotel, return_room, return_cost,
    start_mileage, end_mileage, fuel_level, cleanliness, status, notes, photos,
    created_at, updated_at
FROM contracts;

-- Drop old contracts table
DROP TABLE contracts;

-- Rename new table
ALTER TABLE contracts_new RENAME TO contracts;

-- Recreate indexes for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_company_car_id ON contracts(company_car_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_manager_id ON contracts(manager_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
