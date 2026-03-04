-- Query performance indexes for high-traffic list and calendar screens.
-- Safe for repeated runs.

CREATE INDEX IF NOT EXISTS idx_contracts_client_status_created_at
ON contracts(client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_company_car_created_at
ON contracts(company_car_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_cars_company_status_created_at
ON company_cars(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_contract_status_created_at
ON payments(contract_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_company_car_status_created_at
ON bookings(company_car_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_events_company_start_status
ON calendar_events(company_id, start_date, status);
