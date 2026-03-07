-- Add indexes for hot path queries identified in repo layer
-- Safe for repeated runs.

-- Bookings hot paths
-- listBookingsPage: JOIN company_cars + filter by company_id + status + ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_bookings_company_car_id
ON bookings(company_car_id);

-- Already exists from add_query_performance_indexes.sql:
-- idx_bookings_company_car_status_created_at

-- Cars hot paths
-- listCarsPage: filter by company_id + status + search + sort
CREATE INDEX IF NOT EXISTS idx_company_cars_company_status_created_at
ON company_cars(company_id, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_company_cars_company_status_license_plate
ON company_cars(company_id, status, license_plate ASC, id DESC);

CREATE INDEX IF NOT EXISTS idx_company_cars_company_status_price
ON company_cars(company_id, status, price_per_day DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_company_cars_company_status_mileage
ON company_cars(company_id, status, mileage DESC, id DESC);

-- Users hot paths
-- listUsersPage: filter by role + search + sort
-- Already exists: idx_users_role_created_at_id

CREATE INDEX IF NOT EXISTS idx_users_role_email_id
ON users(role, email ASC, id DESC);

CREATE INDEX IF NOT EXISTS idx_users_role_name_id
ON users(role, name ASC, id DESC);

-- Managers hot paths
-- listCompanyManagersPage: JOIN managers + filter by company_id + is_active
CREATE INDEX IF NOT EXISTS idx_managers_company_active_user
ON managers(company_id, is_active, user_id);

-- Contracts hot paths (additional to existing)
-- listContractsPage: JOIN company_cars + filter by company_id + status + search + sort
CREATE INDEX IF NOT EXISTS idx_contracts_status_start_date_id
ON contracts(status, start_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_status_end_date_id
ON contracts(status, end_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_status_total_amount_id
ON contracts(status, total_amount DESC, id DESC);

-- Calendar hot paths
-- Already exists: idx_calendar_events_company_start_status

-- Payments hot paths
-- Already exists: idx_payments_contract_status_created_at
-- Already exists: idx_payments_status_created_at_id

-- Car templates for JOIN optimization
CREATE INDEX IF NOT EXISTS idx_car_templates_brand_model
ON car_templates(brand_id, model_id);

-- Foreign key indexes for JOIN performance
CREATE INDEX IF NOT EXISTS idx_company_cars_template_id
ON company_cars(template_id);

CREATE INDEX IF NOT EXISTS idx_company_cars_color_id
ON company_cars(color_id);

CREATE INDEX IF NOT EXISTS idx_car_templates_body_type_id
ON car_templates(body_type_id);

CREATE INDEX IF NOT EXISTS idx_car_templates_fuel_type_id
ON car_templates(fuel_type_id);
