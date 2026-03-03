-- Migration: Remove city and gender fields from users table
-- Date: 2026-03-04

-- Note: SQLite does not support DROP COLUMN directly
-- We need to create a new table without these columns and copy data

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Step 1: Create new users table without city and gender columns
CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    name TEXT,
    surname TEXT,
    phone TEXT,
    whatsapp TEXT,
    telegram TEXT,
    passport_number TEXT,
    citizenship TEXT,
    country_id INTEGER,
    date_of_birth TEXT,
    hotel_id INTEGER,
    room_number TEXT,
    location_id INTEGER,
    district_id INTEGER,
    address TEXT,
    avatar_url TEXT,
    passport_photos TEXT,
    driver_license_photos TEXT,
    is_first_login INTEGER DEFAULT 1,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES countries(id),
    FOREIGN KEY (hotel_id) REFERENCES hotels(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (district_id) REFERENCES districts(id)
);

-- Step 2: Copy data from old table to new table (excluding city and gender)
INSERT INTO users_new (
    id, email, password_hash, role, name, surname, phone, whatsapp, telegram,
    passport_number, citizenship, country_id, date_of_birth,
    hotel_id, room_number, location_id, district_id, address,
    avatar_url, passport_photos, driver_license_photos,
    is_first_login, archived_at, created_at, updated_at
)
SELECT 
    id, email, password_hash, role, name, surname, phone, whatsapp, telegram,
    passport_number, citizenship, country_id, date_of_birth,
    hotel_id, room_number, location_id, district_id, address,
    avatar_url, passport_photos, driver_license_photos,
    is_first_login, archived_at, created_at, updated_at
FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table to users
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes if any existed
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_passport_number ON users(passport_number);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
