-- Remove company_id from seasons and rental_durations (make them global for admin only)

-- Step 1: Create new tables without company_id
CREATE TABLE IF NOT EXISTS seasons_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_name TEXT NOT NULL,
    start_month INTEGER NOT NULL,
    start_day INTEGER NOT NULL,
    end_month INTEGER NOT NULL,
    end_day INTEGER NOT NULL,
    price_multiplier REAL NOT NULL DEFAULT 1,
    discount_label TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rental_durations_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    range_name TEXT NOT NULL,
    min_days INTEGER NOT NULL,
    max_days INTEGER,
    price_multiplier REAL NOT NULL DEFAULT 1,
    discount_label TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Step 2: Copy data from old tables (keeping only unique records)
INSERT INTO seasons_new (season_name, start_month, start_day, end_month, end_day, price_multiplier, discount_label, created_at, updated_at)
SELECT DISTINCT season_name, start_month, start_day, end_month, end_day, price_multiplier, discount_label, created_at, updated_at
FROM seasons
WHERE id IN (SELECT MIN(id) FROM seasons GROUP BY season_name, start_month, start_day, end_month, end_day);

INSERT INTO rental_durations_new (range_name, min_days, max_days, price_multiplier, discount_label, created_at, updated_at)
SELECT DISTINCT range_name, min_days, max_days, price_multiplier, discount_label, created_at, updated_at
FROM rental_durations
WHERE id IN (SELECT MIN(id) FROM rental_durations GROUP BY range_name, min_days, max_days);

-- Step 3: Drop old tables
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS rental_durations;

-- Step 4: Rename new tables
ALTER TABLE seasons_new RENAME TO seasons;
ALTER TABLE rental_durations_new RENAME TO rental_durations;

-- Step 5: Recreate indexes (without company_id)
DROP INDEX IF EXISTS idx_seasons_company_id;
DROP INDEX IF EXISTS idx_rental_durations_company_id;
