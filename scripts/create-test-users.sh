#!/bin/bash

# Script to create test users for Manager and User roles

echo "🚀 Creating test users for Phuket Ride..."
echo ""

# Apply migration locally
echo "📝 Applying migration to local database..."
wrangler d1 execute phuketride-bd --local --file=./drizzle/0015_create_test_users.sql

echo ""
echo "✅ Migration applied successfully!"
echo ""

# Verify users were created
echo "🔍 Verifying users..."
wrangler d1 execute phuketride-bd --local --command "SELECT id, email, role, name, surname FROM users WHERE email IN ('manager@phuketride.com', 'user@phuketride.com')"

echo ""
echo "🔍 Verifying manager assignment..."
wrangler d1 execute phuketride-bd --local --command "SELECT * FROM managers WHERE user_id = 'manager-test-001'"

echo ""
echo "🔍 Verifying test contract..."
wrangler d1 execute phuketride-bd --local --command "SELECT id, client_id, manager_id, status, total_amount FROM contracts WHERE id = 9999"

echo ""
echo "✨ Test users created successfully!"
echo ""
echo "📋 Login credentials:"
echo ""
echo "Manager Account:"
echo "  Email: manager@phuketride.com"
echo "  Password: password123"
echo ""
echo "User Account (Client):"
echo "  Email: user@phuketride.com"
echo "  Password: password123"
echo ""
echo "🌐 Start the dev server with: npm run dev"
echo "🔗 Then visit: http://localhost:5173/login"
