-- Districts and beaches seed data for Phuket
-- 
-- Usage:
-- Local:  npx wrangler d1 execute phuketride-bd --local --file=./scripts/seed-districts.sql
-- Remote: npx wrangler d1 execute phuketride-bd --remote --file=./scripts/seed-districts.sql
--
-- Note: Run migration first to add 'beaches' column:
-- npx wrangler d1 execute phuketride-bd --local --command="ALTER TABLE districts ADD COLUMN beaches text;"

-- Clear existing districts for Phuket (location_id = 1)
DELETE FROM districts WHERE location_id = 1;

-- Districts and beaches for Phuket (location_id = 1)
-- Based on Phuket district structure with beaches/locations
INSERT INTO districts (name, location_id, beaches, delivery_price, created_at, updated_at)
VALUES
  -- Airport
  ('Airport', 1, '["Phuket Airport", "Thepkrasattri Rd", "Heroines Monument", "Mai Khao area", "Nai Yang area"]', 1000, unixepoch(), unixepoch()),
  
  -- Bang Tao
  ('Bang Tao', 1, '["Bang Tao Beach", "Layan Beach"]', 900, unixepoch(), unixepoch()),
  
  -- Chalong
  ('Chalong', 1, '["Chalong Bay", "Cape Panwa Beach", "Khao Khad Beach"]', 700, unixepoch(), unixepoch()),
  
  -- Kamala
  ('Kamala', 1, '["Kamala Beach"]', 800, unixepoch(), unixepoch()),
  
  -- Karon
  ('Karon', 1, '["Karon Beach", "Karon Noi Beach"]', 700, unixepoch(), unixepoch()),
  
  -- Kata
  ('Kata', 1, '["Kata Beach", "Kata Noi Beach"]', 700, unixepoch(), unixepoch()),
  
  -- Kathu
  ('Kathu', 1, '["Central Festival", "Phang Muang Sai Kor Rd", "Loch Palm Golf", "Patong Hill"]', 600, unixepoch(), unixepoch()),
  
  -- Mai Khao
  ('Mai Khao', 1, '["Mai Khao Beach", "Sai Kaew Beach"]', 1200, unixepoch(), unixepoch()),
  
  -- Nai Harn
  ('Nai Harn', 1, '["Nai Harn Beach"]', 900, unixepoch(), unixepoch()),
  
  -- Nai Thon
  ('Nai Thon', 1, '["Nai Thon Beach", "Banana Beach"]', 1100, unixepoch(), unixepoch()),
  
  -- Nai Yang
  ('Nai Yang', 1, '["Nai Yang Beach"]', 1100, unixepoch(), unixepoch()),
  
  -- Patong
  ('Patong', 1, '["Patong Beach", "Kalim Beach", "Paradise Beach"]', 600, unixepoch(), unixepoch()),
  
  -- Phuket Town
  ('Phuket Town', 1, '["Phuket Old Town", "Thalang Rd", "Yaowarat Rd", "Boat Lagoon", "Koh Kaew"]', 500, unixepoch(), unixepoch()),
  
  -- Rawai
  ('Rawai', 1, '["Rawai Beach", "Friendship Beach", "Yanui Beach"]', 900, unixepoch(), unixepoch()),
  
  -- Surin
  ('Surin', 1, '["Surin Beach", "Pansea Beach"]', 900, unixepoch(), unixepoch());
