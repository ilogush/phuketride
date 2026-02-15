-- Clean up test data from car_templates table
DELETE FROM car_templates;

-- Reset auto-increment counter
DELETE FROM sqlite_sequence WHERE name = 'car_templates';
