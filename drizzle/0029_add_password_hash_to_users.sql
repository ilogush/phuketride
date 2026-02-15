-- Add password hash to users table for real authentication.
-- Stored as a single string: e.g. "pbkdf2$sha256$210000$<salt_b64>$<hash_b64>"

ALTER TABLE users ADD COLUMN password_hash TEXT;

