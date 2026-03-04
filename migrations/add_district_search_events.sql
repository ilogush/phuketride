CREATE TABLE IF NOT EXISTS district_search_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district_name TEXT NOT NULL,
    search_query TEXT,
    source TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_district_search_events_created_at
ON district_search_events(created_at);

CREATE INDEX IF NOT EXISTS idx_district_search_events_district_name
ON district_search_events(district_name);
