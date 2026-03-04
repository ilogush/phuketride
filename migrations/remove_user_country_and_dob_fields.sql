-- Migration: Remove country_id and date_of_birth fields from users table
-- Date: 2026-03-04

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    name TEXT,
    surname TEXT,
    phone TEXT,
    whatsapp TEXT,
    telegram TEXT,
    passport_number TEXT,
    passport_photos TEXT,
    driver_license_photos TEXT,
    avatar_url TEXT,
    hotel_id INTEGER,
    room_number TEXT,
    location_id INTEGER,
    district_id INTEGER,
    address TEXT,
    is_first_login INTEGER DEFAULT 1,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (district_id) REFERENCES districts(id)
);

INSERT INTO users_new (
    id, email, password_hash, role, name, surname, phone, whatsapp, telegram,
    passport_number, passport_photos, driver_license_photos, avatar_url,
    hotel_id, room_number, location_id, district_id, address,
    is_first_login, archived_at, created_at, updated_at
)
SELECT
    id, email, password_hash, role, name, surname, phone, whatsapp, telegram,
    passport_number, passport_photos, driver_license_photos, avatar_url,
    hotel_id, room_number, location_id, district_id, address,
    is_first_login, archived_at, created_at, updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_archived_at ON users(archived_at);

PRAGMA foreign_keys = ON;
