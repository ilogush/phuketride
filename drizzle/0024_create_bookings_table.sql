-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    client_id TEXT NOT NULL,
    manager_id TEXT,
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    estimated_amount REAL NOT NULL,
    currency TEXT DEFAULT 'THB',
    deposit_amount REAL DEFAULT 0,
    deposit_paid INTEGER DEFAULT 0,
    deposit_payment_method TEXT CHECK(deposit_payment_method IN ('cash', 'bank_transfer', 'card')),
    -- Client details
    client_name TEXT NOT NULL,
    client_surname TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    client_passport TEXT,
    -- Pickup/Return
    pickup_district_id INTEGER,
    pickup_hotel TEXT,
    pickup_room TEXT,
    delivery_cost REAL DEFAULT 0,
    return_district_id INTEGER,
    return_hotel TEXT,
    return_room TEXT,
    return_cost REAL DEFAULT 0,
    -- Extras
    full_insurance_enabled INTEGER DEFAULT 0,
    full_insurance_price REAL DEFAULT 0,
    baby_seat_enabled INTEGER DEFAULT 0,
    baby_seat_price REAL DEFAULT 0,
    island_trip_enabled INTEGER DEFAULT 0,
    island_trip_price REAL DEFAULT 0,
    krabi_trip_enabled INTEGER DEFAULT 0,
    krabi_trip_price REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'converted', 'cancelled')),
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_company_car_id ON bookings(company_car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_company_dates ON bookings(company_car_id, start_date, end_date);
