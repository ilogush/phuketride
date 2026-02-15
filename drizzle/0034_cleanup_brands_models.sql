-- Clean up test data from car_brands and car_models tables
DELETE FROM car_models;
DELETE FROM car_brands;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name = 'car_models';
DELETE FROM sqlite_sequence WHERE name = 'car_brands';
