-- Seed rental durations for company_id = 1
INSERT INTO rental_durations (company_id, range_name, min_days, max_days, price_multiplier, discount_label, created_at, updated_at)
VALUES
  (1, '1-3 days', 1, 3, 1.0, 'Base', unixepoch(), unixepoch()),
  (1, '4-7 days', 4, 7, 0.95, '-5%', unixepoch(), unixepoch()),
  (1, '8-14 days', 8, 14, 0.9, '-10%', unixepoch(), unixepoch()),
  (1, '15-21 days', 15, 21, 0.85, '-15%', unixepoch(), unixepoch()),
  (1, '22-28 days', 22, 28, 0.8, '-20%', unixepoch(), unixepoch()),
  (1, '29+ days', 29, NULL, 0.75, '-25%', unixepoch(), unixepoch());
