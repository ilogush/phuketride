ALTER TABLE company_cars RENAME COLUMN min_insurance_price TO insurance_price_per_day;

ALTER TABLE company_cars ADD COLUMN min_rental_days INTEGER;

UPDATE company_cars
SET min_rental_days = 1
WHERE min_rental_days IS NULL;
