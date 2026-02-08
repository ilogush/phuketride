-- Insert Phuket districts with beaches and locations
-- Location ID for Phuket is 1

INSERT INTO districts (name, location_id, beaches, delivery_price, created_at, updated_at) VALUES
('Airport', 1, '["Phuket Airport", "Thepkrasattri Rd", "Heroines Monument", "Mai Khao area", "Nai Yang area"]', 0, unixepoch(), unixepoch()),
('Bang Tao', 1, '["Bang Tao Beach", "Layan Beach"]', 0, unixepoch(), unixepoch()),
('Chalong', 1, '["Chalong Bay", "Cape Panwa Beach", "Khao Khad Beach"]', 0, unixepoch(), unixepoch()),
('Kamala', 1, '["Kamala Beach"]', 0, unixepoch(), unixepoch()),
('Karon', 1, '["Karon Beach", "Karon Noi Beach"]', 0, unixepoch(), unixepoch()),
('Kata', 1, '["Kata Beach", "Kata Noi Beach"]', 0, unixepoch(), unixepoch()),
('Kathu', 1, '["Central Festival", "Phang Muang Sai Kor Rd", "Loch Palm Golf", "Patong Hill"]', 0, unixepoch(), unixepoch()),
('Mai Khao', 1, '["Mai Khao Beach", "Sai Kaew Beach"]', 0, unixepoch(), unixepoch()),
('Nai Harn', 1, '["Nai Harn Beach"]', 0, unixepoch(), unixepoch()),
('Nai Thon', 1, '["Nai Thon Beach", "Banana Beach"]', 0, unixepoch(), unixepoch()),
('Nai Yang', 1, '["Nai Yang Beach"]', 0, unixepoch(), unixepoch()),
('Patong', 1, '["Patong Beach", "Kalim Beach", "Paradise Beach"]', 0, unixepoch(), unixepoch()),
('Phuket Town', 1, '["Phuket Old Town", "Thalang Rd", "Yaowarat Rd", "Boat Lagoon", "Koh Kaew"]', 0, unixepoch(), unixepoch()),
('Rawai', 1, '["Rawai Beach", "Friendship Beach", "Yanui Beach"]', 0, unixepoch(), unixepoch()),
('Surin', 1, '["Surin Beach", "Pansea Beach"]', 0, unixepoch(), unixepoch());
