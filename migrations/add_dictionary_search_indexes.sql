-- Add indexes for dictionary search performance
CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(name);
CREATE INDEX IF NOT EXISTS idx_car_brands_name ON car_brands(name);
