-- Update existing payment types to add show_on_create and show_on_close flags
-- This migration sets default values for existing payment types

-- Set show_on_create = 1 for payment types typically used when creating contracts
UPDATE payment_types SET show_on_create = 1 
WHERE name IN ('Rental Payment', 'Deposit', 'Extra Service');

-- Set show_on_close = 1 for payment types typically used when closing contracts  
UPDATE payment_types SET show_on_close = 1
WHERE name IN ('Deposit Return', 'Damage Fee', 'Late Return Fee', 'Fuel Charge', 'Cleaning Fee');

-- Both create and close
UPDATE payment_types SET show_on_create = 1, show_on_close = 1
WHERE name IN ('Discount');
