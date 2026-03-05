-- Link car reviews to concrete rental contracts and users
-- so each completed contract can leave only one review.

ALTER TABLE car_reviews ADD COLUMN contract_id INTEGER;
ALTER TABLE car_reviews ADD COLUMN reviewer_user_id TEXT;
ALTER TABLE car_reviews ADD COLUMN cleanliness REAL;
ALTER TABLE car_reviews ADD COLUMN maintenance REAL;
ALTER TABLE car_reviews ADD COLUMN communication REAL;
ALTER TABLE car_reviews ADD COLUMN convenience REAL;
ALTER TABLE car_reviews ADD COLUMN accuracy REAL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_car_reviews_contract_unique
ON car_reviews(contract_id)
WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_car_reviews_car_created_at
ON car_reviews(company_car_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_car_reviews_reviewer_user
ON car_reviews(reviewer_user_id, created_at DESC);
