-- Seed seasons for company_id = 1
INSERT INTO seasons (company_id, season_name, start_month, start_day, end_month, end_day, price_multiplier, discount_label, created_at, updated_at)
VALUES
  (1, 'Peak Season', 12, 20, 1, 20, 1.5, '+50%', unixepoch(), unixepoch()),
  (1, 'High Season', 1, 21, 5, 5, 1.3, '+30%', unixepoch(), unixepoch()),
  (1, 'Low Season', 5, 6, 10, 20, 1.0, 'Base', unixepoch(), unixepoch()),
  (1, 'Shoulder Season', 10, 21, 12, 19, 1.1, '+10%', unixepoch(), unixepoch());
