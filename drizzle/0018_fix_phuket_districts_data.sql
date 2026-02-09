-- Fix Phuket districts data with correct beaches and streets

-- Patong (id=1)
UPDATE districts SET 
  beaches = '["Patong Beach", "Kalim Beach", "Paradise Beach", "Tri Trang Beach"]',
  streets = '["Bangla Road", "Beach Road", "Rat-U-Thit Road", "Sai Nam Yen Road", "Prabaramee Road"]'
WHERE id = 1;

-- Kata (id=2)
UPDATE districts SET 
  beaches = '["Kata Beach", "Kata Noi Beach"]',
  streets = '["Kata Road", "Patak Road", "Karon Viewpoint Road"]'
WHERE id = 2;

-- Karon (id=3)
UPDATE districts SET 
  beaches = '["Karon Beach", "Karon Noi Beach"]',
  streets = '["Karon Road", "Patak Road", "Luang Poh Chuan Road"]'
WHERE id = 3;

-- Rawai (id=4)
UPDATE districts SET 
  beaches = '["Rawai Beach", "Friendship Beach", "Yanui Beach", "Nai Harn Beach"]',
  streets = '["Viset Road", "Rawai Beach Road", "Soi Naya"]'
WHERE id = 4;

-- Phuket Town (id=6)
UPDATE districts SET 
  beaches = '["Phuket Old Town", "Boat Lagoon", "Koh Kaew"]',
  streets = '["Thalang Road", "Yaowarat Road", "Dibuk Road", "Phang Nga Road", "Krabi Road", "Rasada Road", "Thepkasattri Road"]'
WHERE id = 6;

-- Airport (id=7)
UPDATE districts SET 
  beaches = '["Phuket Airport", "Heroines Monument"]',
  streets = '["Thepkrasattri Road", "Airport Road"]'
WHERE id = 7;

-- Bang Tao (id=8)
UPDATE districts SET 
  beaches = '["Bang Tao Beach", "Layan Beach"]',
  streets = '["Laguna Road", "Cherngtalay Road", "Srisoonthorn Road"]'
WHERE id = 8;

-- Chalong (id=31)
UPDATE districts SET 
  beaches = '["Chalong Bay", "Chalong Pier"]',
  streets = '["Chao Fah East Road", "Chao Fah West Road", "Patak Road"]'
WHERE id = 31;

-- Kamala (id=32)
UPDATE districts SET 
  beaches = '["Kamala Beach"]',
  streets = '["Kamala Beach Road", "Rim Had Road"]'
WHERE id = 32;

-- Kathu (id=33)
UPDATE districts SET 
  beaches = '["Central Festival", "Loch Palm Golf", "Patong Hill"]',
  streets = '["Vichit Songkram Road", "Phang Muang Sai Kor Road", "Kathu Waterfall Road"]'
WHERE id = 33;

-- Mai Khao (id=34)
UPDATE districts SET 
  beaches = '["Mai Khao Beach", "Sai Kaew Beach"]',
  streets = '["Mai Khao Beach Road", "Thepkrasattri Road"]'
WHERE id = 34;

-- Nai Harn (id=35) - moved to Rawai
DELETE FROM districts WHERE id = 35;

-- Nai Thon (id=36)
UPDATE districts SET 
  beaches = '["Nai Thon Beach", "Banana Beach"]',
  streets = '["Nai Thon Beach Road"]'
WHERE id = 36;

-- Nai Yang (id=37)
UPDATE districts SET 
  beaches = '["Nai Yang Beach"]',
  streets = '["Nai Yang Beach Road", "Sakhu Road"]'
WHERE id = 37;

-- Surin (id=38)
UPDATE districts SET 
  beaches = '["Surin Beach", "Pansea Beach"]',
  streets = '["Surin Beach Road", "Srisoonthorn Road"]'
WHERE id = 38;

-- Add Cape Panwa as separate district
INSERT INTO districts (name, beaches, streets, location_id, is_active, created_at, updated_at) VALUES
('Cape Panwa', '["Cape Panwa Beach", "Khao Khad Beach"]', '["Sakdidej Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000);
