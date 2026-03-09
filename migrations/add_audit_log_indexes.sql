-- add performance indexes for audit_logs and key business entities
-- Safe for repeated runs.

-- audit_logs performance (Dashboard, Analytics)
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created_at
ON audit_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created_at
ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created_at
ON audit_logs(entity_type, entity_id, created_at DESC);

-- more specific business logic indexes 
CREATE INDEX IF NOT EXISTS idx_contracts_company_status_created_at
ON contracts(company_car_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_client_status_created_at
ON bookings(client_id, status, created_at DESC);

-- P3.4 District search optimization
CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(name);

-- P3.5 Brand search optimization
CREATE INDEX IF NOT EXISTS idx_car_brands_name ON car_brands(name);

-- P3.6: Optional: index on company_cars(registration_number)
CREATE INDEX IF NOT EXISTS idx_company_cars_license_plate ON company_cars(license_plate);
