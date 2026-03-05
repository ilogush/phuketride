-- Cover companies list paging sort to avoid temp B-tree in IDs-page query.
-- Safe for repeated runs.

CREATE INDEX IF NOT EXISTS idx_companies_archived_created_at_id
ON companies(archived_at, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_companies_archived_name_id
ON companies(archived_at, name ASC, id DESC);
