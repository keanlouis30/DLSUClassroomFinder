-- SQL Diagnostic Script for user_buildings table
-- Run this in Supabase SQL Editor to check and fix the setup

-- 1. Check if user_buildings table exists
SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'user_buildings'
) AS "user_buildings_exists";

-- 2. Check if user_buildings has any data
SELECT COUNT(*) as "user_buildings_count" FROM user_buildings;

-- 3. List all users and their roles
SELECT id, email, role, name FROM users LIMIT 10;

-- 4. List all buildings
SELECT id, name, code FROM buildings LIMIT 10;

-- 5. List user_buildings assignments
SELECT ub.id, u.email, u.role, b.name
FROM user_buildings ub
JOIN users u ON ub.user_id = u.id
JOIN buildings b ON ub.building_id = b.id;

-- 6. Check your current logged-in user (you'll need to know the ID)
-- After running the above, insert a building assignment for your manager user
-- Replace the UUIDs with actual values from your database:
-- Example:
-- INSERT INTO user_buildings (user_id, building_id)
-- SELECT u.id, b.id
-- FROM users u, buildings b
-- WHERE u.role = 'manager' AND u.email LIKE '%@dlsu.edu.ph'
-- LIMIT 1
-- ON CONFLICT (user_id, building_id) DO NOTHING;
