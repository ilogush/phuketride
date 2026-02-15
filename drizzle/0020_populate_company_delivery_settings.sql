-- Populate company_delivery_settings for existing companies
INSERT INTO company_delivery_settings (company_id, district_id, is_active, delivery_price, created_at, updated_at)
SELECT 
    c.id as company_id,
    d.id as district_id,
    1 as is_active,
    0 as delivery_price,
    datetime('now') as created_at,
    datetime('now') as updated_at
FROM companies c
CROSS JOIN districts d
WHERE NOT EXISTS (
    SELECT 1 FROM company_delivery_settings cds 
    WHERE cds.company_id = c.id AND cds.district_id = d.id
);
