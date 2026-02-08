-- Update districts with beaches and streets information based on 2026 data

-- Airport
UPDATE districts SET 
  beaches = '["Phuket Airport", "Mai Khao area", "Nai Yang area", "Thepkrasattri Rd", "Heroines Monument"]',
  streets = '["Thepkrasattri Road", "Airport Road", "Mai Khao Beach Road"]'
WHERE name = 'Airport' AND location_id = 1;

-- Bang Tao
UPDATE districts SET 
  beaches = '["Bang Tao Beach", "Layan Beach"]',
  streets = '["Laguna Road", "Cherngtalay Road", "Srisoonthorn Road"]'
WHERE name = 'Bang Tao' AND location_id = 1;

-- Chalong
UPDATE districts SET 
  beaches = '["Chalong Bay", "Cape Panwa Beach", "Khao Khad Beach"]',
  streets = '["Chao Fah East Road", "Chao Fah West Road", "Patak Road"]'
WHERE name = 'Chalong' AND location_id = 1;

-- Kamala
UPDATE districts SET 
  beaches = '["Kamala Beach"]',
  streets = '["Kamala Beach Road", "Rim Had Road"]'
WHERE name = 'Kamala' AND location_id = 1;

-- Karon
UPDATE districts SET 
  beaches = '["Karon Beach", "Karon Noi Beach"]',
  streets = '["Karon Road", "Patak Road", "Luang Poh Chuan Road"]'
WHERE name = 'Karon' AND location_id = 1;

-- Kata
UPDATE districts SET 
  beaches = '["Kata Beach", "Kata Noi Beach"]',
  streets = '["Kata Road", "Patak Road", "Karon Viewpoint Road"]'
WHERE name = 'Kata' AND location_id = 1;

-- Kathu
UPDATE districts SET 
  beaches = '["Patong Hill"]',
  streets = '["Vichit Songkram Road", "Phang Muang Sai Kor Road", "Kathu Waterfall Road"]'
WHERE name = 'Kathu' AND location_id = 1;

-- Mai Khao
UPDATE districts SET 
  beaches = '["Mai Khao Beach", "Sai Kaew Beach"]',
  streets = '["Mai Khao Beach Road", "Thepkrasattri Road"]'
WHERE name = 'Mai Khao' AND location_id = 1;

-- Nai Harn
UPDATE districts SET 
  beaches = '["Nai Harn Beach"]',
  streets = '["Nai Harn Beach Road", "Viset Road"]'
WHERE name = 'Nai Harn' AND location_id = 1;

-- Nai Thon
UPDATE districts SET 
  beaches = '["Nai Thon Beach", "Banana Beach"]',
  streets = '["Nai Thon Beach Road"]'
WHERE name = 'Nai Thon' AND location_id = 1;

-- Nai Yang
UPDATE districts SET 
  beaches = '["Nai Yang Beach"]',
  streets = '["Nai Yang Beach Road", "Sakhu Road"]'
WHERE name = 'Nai Yang' AND location_id = 1;

-- Patong
UPDATE districts SET 
  beaches = '["Patong Beach", "Kalim Beach", "Paradise Beach", "Tri Trang Beach"]',
  streets = '["Bangla Road", "Beach Road", "Rat-U-Thit Road", "Sai Nam Yen Road", "Prabaramee Road"]'
WHERE name = 'Patong' AND location_id = 1;

-- Phuket Town
UPDATE districts SET 
  beaches = '["Phuket Old Town", "Boat Lagoon", "Koh Kaew"]',
  streets = '["Thalang Road", "Yaowarat Road", "Dibuk Road", "Phang Nga Road", "Krabi Road", "Rasada Road", "Thepkasattri Road"]'
WHERE name = 'Phuket Town' AND location_id = 1;

-- Rawai
UPDATE districts SET 
  beaches = '["Rawai Beach", "Friendship Beach", "Yanui Beach"]',
  streets = '["Viset Road", "Rawai Beach Road", "Soi Naya"]'
WHERE name = 'Rawai' AND location_id = 1;

-- Surin
UPDATE districts SET 
  beaches = '["Surin Beach", "Pansea Beach"]',
  streets = '["Surin Beach Road", "Srisoonthorn Road"]'
WHERE name = 'Surin' AND location_id = 1;
