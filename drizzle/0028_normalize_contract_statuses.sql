-- Normalize contract statuses to two-state model: active | closed
UPDATE contracts
SET status = 'active'
WHERE status IS NULL OR TRIM(status) = '';

UPDATE contracts
SET status = 'closed'
WHERE status NOT IN ('active', 'closed');
