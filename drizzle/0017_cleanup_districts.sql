-- Delete duplicate districts (keep the ones with proper JSON format and streets data)
-- Keep: 1, 2, 3, 4, 6, 7, 8, 18, 19, 20, 21
-- Delete: 5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 30

DELETE FROM districts WHERE id IN (5, 9, 10, 11, 12, 13, 14, 15, 16, 17, 22, 23, 24, 25, 26, 27, 28, 29, 30);

-- Update existing districts with proper beaches and streets data
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
  beaches = '["Rawai Beach", "Friendship Beach", "Yanui Beach"]',
  streets = '["Viset Road", "Rawai Beach Road", "Soi Naya"]'
WHERE id = 4;

-- Phuket Town (id=6)
UPDATE districts SET 
  beaches = '["Phuket Old Town", "Boat Lagoon", "Koh Kaew"]',
  streets = '["Thalang Road", "Yaowarat Road", "Dibuk Road", "Phang Nga Road", "Krabi Road", "Rasada Road", "Thepkasattri Road"]',
  is_active = 1
WHERE id = 6;

-- Airport (id=7)
UPDATE districts SET 
  beaches = '["Phuket Airport", "Thepkrasattri Rd", "Heroines Monument", "Mai Khao area", "Nai Yang area"]',
  streets = '["Thepkrasattri Road", "Airport Road", "Mai Khao Beach Road"]'
WHERE id = 7;

-- Bang Tao (id=8)
UPDATE districts SET 
  beaches = '["Bang Tao Beach", "Layan Beach"]',
  streets = '["Laguna Road", "Cherngtalay Road", "Srisoonthorn Road"]'
WHERE id = 8;

-- Insert new districts with proper data
INSERT INTO districts (name, beaches, streets, location_id, is_active, created_at, updated_at) VALUES
('Chalong', '["Chalong Bay", "Cape Panwa Beach", "Khao Khad Beach"]', '["Chao Fah East Road", "Chao Fah West Road", "Patak Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Kamala', '["Kamala Beach"]', '["Kamala Beach Road", "Rim Had Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Kathu', '["Central Festival", "Phang Muang Sai Kor Rd", "Loch Palm Golf", "Patong Hill"]', '["Vichit Songkram Road", "Phang Muang Sai Kor Road", "Kathu Waterfall Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Mai Khao', '["Mai Khao Beach", "Sai Kaew Beach"]', '["Mai Khao Beach Road", "Thepkrasattri Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Nai Harn', '["Nai Harn Beach"]', '["Nai Harn Beach Road", "Viset Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Nai Thon', '["Nai Thon Beach", "Banana Beach"]', '["Nai Thon Beach Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Nai Yang', '["Nai Yang Beach"]', '["Nai Yang Beach Road", "Sakhu Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Surin', '["Surin Beach", "Pansea Beach"]', '["Surin Beach Road", "Srisoonthorn Road"]', 1, 1, unixepoch() * 1000, unixepoch() * 1000);
