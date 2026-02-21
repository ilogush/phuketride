CREATE TABLE IF NOT EXISTS car_rating_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    total_rating REAL DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    cleanliness REAL DEFAULT 0,
    maintenance REAL DEFAULT 0,
    communication REAL DEFAULT 0,
    convenience REAL DEFAULT 0,
    accuracy REAL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (company_car_id) REFERENCES company_cars(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS car_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_avatar_url TEXT,
    rating INTEGER DEFAULT 5,
    review_text TEXT NOT NULL,
    review_date INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (company_car_id) REFERENCES company_cars(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS car_included_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    category TEXT DEFAULT 'Convenience',
    title TEXT NOT NULL,
    description TEXT,
    icon_key TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (company_car_id) REFERENCES company_cars(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS car_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon_key TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (company_car_id) REFERENCES company_cars(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS car_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_car_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (company_car_id) REFERENCES company_cars(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_car_rating_metrics_car ON car_rating_metrics(company_car_id);
CREATE INDEX IF NOT EXISTS idx_car_reviews_car ON car_reviews(company_car_id);
CREATE INDEX IF NOT EXISTS idx_car_reviews_sort ON car_reviews(company_car_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_car_included_items_car ON car_included_items(company_car_id);
CREATE INDEX IF NOT EXISTS idx_car_included_items_sort ON car_included_items(company_car_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_car_rules_car ON car_rules(company_car_id);
CREATE INDEX IF NOT EXISTS idx_car_rules_sort ON car_rules(company_car_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_car_features_car ON car_features(company_car_id);
CREATE INDEX IF NOT EXISTS idx_car_features_sort ON car_features(company_car_id, sort_order);

INSERT INTO car_rating_metrics (
    company_car_id,
    total_rating,
    total_ratings,
    cleanliness,
    maintenance,
    communication,
    convenience,
    accuracy,
    created_at,
    updated_at
)
SELECT
    5,
    4.96,
    91,
    5.0,
    5.0,
    5.0,
    4.9,
    5.0,
    strftime('%s', 'now'),
    strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_rating_metrics WHERE company_car_id = 5);

INSERT INTO car_reviews (company_car_id, reviewer_name, rating, review_text, review_date, sort_order, created_at, updated_at)
SELECT 5, 'Matthew', 5, 'Incredible vehicle, real head turner. Lots of fun to drive and very comfortable.', strftime('%s','2025-12-02'), 1, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_reviews WHERE company_car_id = 5 AND sort_order = 1);

INSERT INTO car_reviews (company_car_id, reviewer_name, rating, review_text, review_date, sort_order, created_at, updated_at)
SELECT 5, 'Alan', 5, 'Easy pickup and drop off, great looking car. Thanks.', strftime('%s','2025-11-24'), 2, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_reviews WHERE company_car_id = 5 AND sort_order = 2);

INSERT INTO car_reviews (company_car_id, reviewer_name, rating, review_text, review_date, sort_order, created_at, updated_at)
SELECT 5, 'Ryan', 5, 'Excellent communication and smooth trip from start to finish.', strftime('%s','2025-10-14'), 3, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_reviews WHERE company_car_id = 5 AND sort_order = 3);

INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'Convenience', 'Skip the rental counter', 'Use app instructions for pickup and return', 'truck', 1, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_included_items WHERE company_car_id = 5 AND sort_order = 1);

INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'Convenience', 'Additional drivers for free', NULL, 'users', 2, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_included_items WHERE company_car_id = 5 AND sort_order = 2);

INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'Convenience', '30-minute return grace period', 'No need to extend unless delay is longer than 30 min', 'clock', 3, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_included_items WHERE company_car_id = 5 AND sort_order = 3);

INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'Peace of mind', 'Keep the vehicle tidy', 'Please return the vehicle in a clean condition.', 'sparkles', 4, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_included_items WHERE company_car_id = 5 AND sort_order = 4);

INSERT INTO car_included_items (company_car_id, category, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'Peace of mind', '24/7 customer support', NULL, 'support', 5, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_included_items WHERE company_car_id = 5 AND sort_order = 5);

INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'No smoking allowed', 'Smoking may result in a fine.', 'no_smoking', 1, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_rules WHERE company_car_id = 5 AND sort_order = 1);

INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'Keep the vehicle tidy', 'Unreasonably dirty vehicles may result in a fee.', 'tidy', 2, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_rules WHERE company_car_id = 5 AND sort_order = 2);

INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'Refuel the vehicle', 'Missing fuel may result in an additional fee.', 'fuel', 3, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_rules WHERE company_car_id = 5 AND sort_order = 3);

INSERT INTO car_rules (company_car_id, title, description, icon_key, sort_order, created_at, updated_at)
SELECT 5, 'No off-roading', 'Vehicle tracking may be used for recovery and protection.', 'offroad', 4, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_rules WHERE company_car_id = 5 AND sort_order = 4);

INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at)
SELECT 5, 'Safety', 'Brake assist', 1, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_features WHERE company_car_id = 5 AND category = 'Safety' AND sort_order = 1);

INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at)
SELECT 5, 'Safety', 'Airbags', 2, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_features WHERE company_car_id = 5 AND category = 'Safety' AND sort_order = 2);

INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at)
SELECT 5, 'Device connectivity', 'Bluetooth', 3, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_features WHERE company_car_id = 5 AND category = 'Device connectivity' AND sort_order = 3);

INSERT INTO car_features (company_car_id, category, name, sort_order, created_at, updated_at)
SELECT 5, 'Device connectivity', 'USB charger', 4, strftime('%s', 'now'), strftime('%s', 'now')
WHERE NOT EXISTS (SELECT 1 FROM car_features WHERE company_car_id = 5 AND category = 'Device connectivity' AND sort_order = 4);
