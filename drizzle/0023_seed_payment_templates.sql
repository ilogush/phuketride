-- Seed payment templates (system-wide, company_id = NULL)
-- These are default templates that all companies can use

-- Payment templates for CONTRACT CREATION (show_on_create = 1)
INSERT OR IGNORE INTO payment_types (name, sign, description, company_id, is_system, is_active, show_on_create, show_on_close, created_at, updated_at) VALUES
-- Income (money received from client)
('Rental Payment', '+', 'Main rental fee for the contract period', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Deposit', '+', 'Security deposit from client', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Advance Payment', '+', 'Prepayment before contract starts', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Delivery Fee', '+', 'Car delivery to client location', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Baby Seat Rental', '+', 'Baby seat rental fee', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Full Insurance', '+', 'Full insurance coverage fee', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Extra Hours Fee', '+', 'Fee for pickup/return outside office hours', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Island Trip Fee', '+', 'Additional fee for island trips', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Krabi Trip Fee', '+', 'Additional fee for Krabi trips', NULL, 1, 1, 1, 0, unixepoch(), unixepoch()),
('Additional Driver', '+', 'Fee for additional driver', NULL, 1, 1, 1, 0, unixepoch(), unixepoch());

-- Payment templates for CONTRACT CLOSING (show_on_close = 1)
INSERT OR IGNORE INTO payment_types (name, sign, description, company_id, is_system, is_active, show_on_create, show_on_close, created_at, updated_at) VALUES
-- Expense (money returned to client)
('Deposit Return', '-', 'Return security deposit to client', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
('Overpayment Refund', '-', 'Refund overpaid amount', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
-- Income (additional charges)
('Damage Fee', '+', 'Fee for vehicle damage', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
('Late Return Fee', '+', 'Fee for late return (per hour/day)', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
('Fuel Difference', '+', 'Charge for missing fuel', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
('Cleaning Fee', '+', 'Fee for dirty vehicle', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
('Mileage Overage', '+', 'Fee for exceeding mileage limit', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
('Traffic Fine', '+', 'Traffic violation fine', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
('Lost Items Fee', '+', 'Fee for lost keys, documents, etc.', NULL, 1, 1, 0, 1, unixepoch(), unixepoch()),
('Contract Extension', '+', 'Fee for extending contract period', NULL, 1, 1, 0, 1, unixepoch(), unixepoch());

-- Universal templates (can be used both on create and close)
INSERT OR IGNORE INTO payment_types (name, sign, description, company_id, is_system, is_active, show_on_create, show_on_close, created_at, updated_at) VALUES
('Discount', '-', 'Promotional or loyalty discount', NULL, 1, 1, 1, 1, unixepoch(), unixepoch());
