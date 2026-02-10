-- Add archived_at fields for soft delete functionality

-- Add archived_at to users table
ALTER TABLE users ADD COLUMN archived_at INTEGER;

-- Add archived_at to companies table
ALTER TABLE companies ADD COLUMN archived_at INTEGER;

-- Create indexes for archived_at fields for better query performance
CREATE INDEX idx_users_archived_at ON users(archived_at);
CREATE INDEX idx_companies_archived_at ON companies(archived_at);
