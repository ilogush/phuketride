-- Add is_active column to districts table
ALTER TABLE districts ADD COLUMN is_active INTEGER DEFAULT 0;

-- Set existing districts to active (Airport and Bang Tao from the example)
UPDATE districts SET is_active = 1 WHERE name IN ('Airport', 'Bang Tao');
