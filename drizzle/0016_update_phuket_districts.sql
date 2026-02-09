-- Update existing districts and add new ones for Phuket
-- location_id = 1 (Phuket)

-- Update existing districts with beaches/locations info
UPDATE districts SET beaches = 'Phuket Airport, Thepkrasattri Rd, Heroines Monument, Mai Khao area, Nai Yang area' WHERE id = 7 AND name = 'Airport';
UPDATE districts SET beaches = 'Bang Tao Beach, Layan Beach' WHERE id = 8 AND name = 'Bang Tao';
UPDATE districts SET beaches = 'Karon Beach, Karon Noi Beach' WHERE id = 3 AND name = 'Karon';
UPDATE districts SET beaches = 'Kata Beach, Kata Noi Beach' WHERE id = 2 AND name = 'Kata';
UPDATE districts SET beaches = 'Patong Beach, Kalim Beach, Paradise Beach' WHERE id = 1 AND name = 'Patong';
UPDATE districts SET beaches = 'Rawai Beach, Friendship Beach, Yanui Beach' WHERE id = 4 AND name = 'Rawai';

-- Insert new districts
INSERT INTO districts (name, beaches, location_id, is_active, created_at, updated_at) VALUES
('Chalong', 'Chalong Bay, Cape Panwa Beach, Khao Khad Beach', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Kamala', 'Kamala Beach', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Kathu', 'Central Festival, Phang Muang Sai Kor Rd, Loch Palm Golf, Patong Hill', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Mai Khao', 'Mai Khao Beach, Sai Kaew Beach', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Nai Harn', 'Nai Harn Beach', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Nai Thon', 'Nai Thon Beach, Banana Beach', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Nai Yang', 'Nai Yang Beach', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Phuket Town', 'Phuket Old Town, Thalang Rd, Yaowarat Rd, Boat Lagoon, Koh Kaew', 1, 1, unixepoch() * 1000, unixepoch() * 1000),
('Surin', 'Surin Beach, Pansea Beach', 1, 1, unixepoch() * 1000, unixepoch() * 1000);
