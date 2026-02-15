-- Create company_delivery_settings table
CREATE TABLE IF NOT EXISTS company_delivery_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    district_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 0,
    delivery_price REAL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE,
    UNIQUE(company_id, district_id)
);

CREATE INDEX idx_company_delivery_settings_company ON company_delivery_settings(company_id);
CREATE INDEX idx_company_delivery_settings_district ON company_delivery_settings(district_id);
