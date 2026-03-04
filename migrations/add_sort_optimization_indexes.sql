-- Additional indexes to reduce temp B-tree usage on ORDER BY created_at.
-- Safe for repeated runs.

CREATE INDEX IF NOT EXISTS idx_users_role_created_at
ON users(role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_created_at
ON payments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_status_created_at
ON contracts(status, created_at DESC);
