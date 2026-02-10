-- Add currencies table
CREATE TABLE IF NOT EXISTS currencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    company_id INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Add indexes for currencies
CREATE INDEX IF NOT EXISTS idx_currencies_company_id ON currencies(company_id);
CREATE INDEX IF NOT EXISTS idx_currencies_is_active ON currencies(is_active);

-- Add show_on_create and show_on_close columns to payment_types
ALTER TABLE payment_types ADD COLUMN show_on_create INTEGER DEFAULT 0;
ALTER TABLE payment_types ADD COLUMN show_on_close INTEGER DEFAULT 0;

-- Update payments table to use currency_id instead of currency text
ALTER TABLE payments ADD COLUMN currency_id INTEGER;

-- Insert default currencies (system-wide)
INSERT INTO currencies (code, name, symbol, is_active, company_id, created_at, updated_at) VALUES
('THB', 'Thai Baht', '฿', 1, NULL, unixepoch(), unixepoch()),
('USD', 'US Dollar', '$', 1, NULL, unixepoch(), unixepoch()),
('EUR', 'Euro', '€', 1, NULL, unixepoch(), unixepoch()),
('RUB', 'Russian Ruble', '₽', 1, NULL, unixepoch(), unixepoch());
