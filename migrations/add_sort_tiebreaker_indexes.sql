-- Improve ORDER BY ... created_at DESC, id DESC without temp sort
CREATE INDEX IF NOT EXISTS idx_users_role_created_at_id
ON users(role, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_created_at_id
ON payments(status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_status_created_at_id
ON contracts(status, created_at DESC, id DESC);
