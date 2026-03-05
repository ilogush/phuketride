-- Denormalized car count for companies list sorting by carCount.
-- NOTE: Run once on remote DB. Includes backfill and sync triggers.

ALTER TABLE companies ADD COLUMN car_count INTEGER NOT NULL DEFAULT 0;

UPDATE companies
SET car_count = (
    SELECT COUNT(*)
    FROM company_cars cc
    WHERE cc.company_id = companies.id
);

CREATE INDEX IF NOT EXISTS idx_companies_archived_car_count_id
ON companies(archived_at, car_count DESC, id DESC);

CREATE TRIGGER IF NOT EXISTS trg_company_cars_ai_update_company_count
AFTER INSERT ON company_cars
BEGIN
    UPDATE companies
    SET car_count = car_count + 1
    WHERE id = NEW.company_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_company_cars_ad_update_company_count
AFTER DELETE ON company_cars
BEGIN
    UPDATE companies
    SET car_count = CASE WHEN car_count > 0 THEN car_count - 1 ELSE 0 END
    WHERE id = OLD.company_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_company_cars_au_company_id_update_company_count
AFTER UPDATE OF company_id ON company_cars
WHEN OLD.company_id IS NOT NEW.company_id
BEGIN
    UPDATE companies
    SET car_count = CASE WHEN car_count > 0 THEN car_count - 1 ELSE 0 END
    WHERE id = OLD.company_id;

    UPDATE companies
    SET car_count = car_count + 1
    WHERE id = NEW.company_id;
END;
