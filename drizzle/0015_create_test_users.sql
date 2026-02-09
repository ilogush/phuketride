-- Create test users for Manager and User roles
-- Password for all test users: password123

-- Manager user
INSERT OR IGNORE INTO users (
    id, 
    email, 
    role, 
    name, 
    surname, 
    phone, 
    whatsapp,
    is_first_login,
    created_at,
    updated_at
) VALUES (
    'manager-test-001',
    'manager@phuketride.com',
    'manager',
    'John',
    'Manager',
    '+66812345001',
    '+66812345001',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Regular user (client)
INSERT OR IGNORE INTO users (
    id, 
    email, 
    role, 
    name, 
    surname, 
    phone, 
    whatsapp,
    citizenship,
    is_first_login,
    created_at,
    updated_at
) VALUES (
    'user-test-001',
    'user@phuketride.com',
    'user',
    'Anna',
    'Client',
    '+66812345002',
    '+66812345002',
    'Russia',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Assign manager to company (assuming company ID 1 exists - Phuket Ride Co.)
INSERT OR IGNORE INTO managers (
    user_id,
    company_id,
    is_active,
    created_at,
    updated_at
) VALUES (
    'manager-test-001',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create a test contract for the user
INSERT OR IGNORE INTO contracts (
    id,
    company_car_id,
    client_id,
    manager_id,
    start_date,
    end_date,
    total_amount,
    total_currency,
    deposit_amount,
    deposit_currency,
    status,
    created_at,
    updated_at
) VALUES (
    9999,
    1,
    'user-test-001',
    'manager-test-001',
    datetime('now', '+1 day'),
    datetime('now', '+8 days'),
    5600,
    'THB',
    3000,
    'THB',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
