-- Seed hotels for Phuket (location_id = 1)
-- District IDs: Karon=3, Patong=1, Kata=2, Bang Tao=6, Chalong=5, Rawai=4, Kamala=8, Mai Khao=10, Surin=15
INSERT INTO hotels (name, location_id, district_id, created_at, updated_at)
VALUES
  ('Amanpuri', 1, 3, unixepoch(), unixepoch()),
  ('Amari Phuket', 1, 1, unixepoch(), unixepoch()),
  ('Andara Resort Villas', 1, 2, unixepoch(), unixepoch()),
  ('Angsana Laguna Phuket', 1, 6, unixepoch(), unixepoch()),
  ('Aochalong Villa Resort & Spa', 1, 5, unixepoch(), unixepoch()),
  ('Banyan Tree Phuket', 1, 6, unixepoch(), unixepoch()),
  ('Beyond Resort Kata', 1, 2, unixepoch(), unixepoch()),
  ('Boathouse Phuket', 1, 4, unixepoch(), unixepoch()),
  ('Cape Sienna Gourmet Hotel & Villas', 1, 8, unixepoch(), unixepoch()),
  ('Centara Grand Beach Resort Phuket', 1, 3, unixepoch(), unixepoch()),
  ('Chalong Miracle Lakeview', 1, 5, unixepoch(), unixepoch()),
  ('Club Med Phuket', 1, 10, unixepoch(), unixepoch()),
  ('COMO Point Yamu', 1, 15, unixepoch(), unixepoch());
