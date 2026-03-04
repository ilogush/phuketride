-- Indexes for detail pages and activity widgets.
-- Safe for repeated runs.

CREATE INDEX IF NOT EXISTS idx_calendar_events_company_status_start_date
ON calendar_events(company_id, status, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_company_cars_license_plate_archived
ON company_cars(license_plate, archived_at);
