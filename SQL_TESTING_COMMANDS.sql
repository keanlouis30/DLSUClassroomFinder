-- QUICK REFERENCE: SQL TESTING COMMANDS
-- Copy and paste directly into Supabase SQL Editor
-- Date: November 25, 2025

-- ============================================================
-- TEST 1: AUTHENTICATION ATTEMPT LOGGING
-- ============================================================

-- 1.1: Verify login_attempts table
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'login_attempts';

-- 1.2: Check table structure
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'login_attempts'
ORDER BY ordinal_position;

-- 1.3: View all recent login attempts
SELECT email, success, error_message, domain_valid, ip_address, created_at 
FROM login_attempts 
ORDER BY created_at DESC LIMIT 20;

-- 1.4: Filter for successful logins only
SELECT email, success, created_at 
FROM login_attempts 
WHERE success = true 
ORDER BY created_at DESC LIMIT 10;

-- 1.5: Filter for failed attempts
SELECT email, success, error_message, created_at 
FROM login_attempts 
WHERE success = false 
ORDER BY created_at DESC LIMIT 10;

-- 1.6: Filter by domain validation failures
SELECT email, domain_valid, error_message, created_at 
FROM login_attempts 
WHERE domain_valid = false 
ORDER BY created_at DESC LIMIT 10;

-- 1.7: Count attempts by email
SELECT email, COUNT(*) as total_attempts, 
       COUNT(CASE WHEN success = true THEN 1 END) as successful,
       COUNT(CASE WHEN success = false THEN 1 END) as failed
FROM login_attempts 
GROUP BY email
ORDER BY total_attempts DESC LIMIT 10;

-- 1.8: View audit logs for user_login action
SELECT user_id, action, details, ip_address, created_at 
FROM audit_logs 
WHERE action = 'user_login' 
ORDER BY created_at DESC LIMIT 10;

-- ============================================================
-- TEST 2: MANAGER DASHBOARD DATA VERIFICATION
-- ============================================================

-- 2.1: Check if user has manager role
SELECT id, email, name, role FROM users 
WHERE role = 'manager' LIMIT 5;

-- 2.2: Get manager assigned buildings
SELECT u.email, ub.building_id, b.name as building_name
FROM user_buildings ub
JOIN users u ON ub.user_id = u.id
JOIN buildings b ON ub.building_id = b.id
WHERE u.role = 'manager'
LIMIT 10;

-- 2.3: Count classrooms per manager's buildings
SELECT COUNT(*) as total_classrooms
FROM classrooms c
WHERE c.building_id IN (
  SELECT building_id FROM user_buildings 
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
);

-- 2.4: Count pending bookings for manager
SELECT COUNT(*) as pending_bookings
FROM bookings b
WHERE b.status = 'pending'
  AND b.classroom_id IN (
    SELECT id FROM classrooms 
    WHERE building_id IN (
      SELECT building_id FROM user_buildings 
      WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
    )
  );

-- 2.5: View recent schedules
SELECT cs.day_of_week, cs.start_time, cs.end_time, cs.subject_code, cs.instructor_name,
       cl.room_number, b.name as building_name, cs.created_at
FROM class_schedules cs
JOIN classrooms cl ON cs.classroom_id = cl.id
JOIN buildings b ON cl.building_id = b.id
ORDER BY cs.created_at DESC LIMIT 10;

-- 2.6: View classroom details
SELECT id, building_id, room_number, floor, capacity, amenities, status, created_at
FROM classrooms 
LIMIT 10;

-- 2.7: View pending bookings
SELECT b.id, u.email, cl.room_number, b.booking_date, b.start_time, b.end_time,
       b.purpose, b.status, b.created_at
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN classrooms cl ON b.classroom_id = cl.id
WHERE b.status = 'pending'
ORDER BY b.created_at DESC LIMIT 10;

-- 2.8: View manager actions in audit log
SELECT action, resource_type, details, created_at
FROM audit_logs 
WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
ORDER BY created_at DESC LIMIT 20;

-- ============================================================
-- TEST 3: IP-BASED RATE LIMITING
-- ============================================================

-- 3.1: Check rate limit configuration
SELECT * FROM rate_limit_config;

-- 3.2: View rate limit config details
SELECT 
  max_failed_attempts,
  lockout_duration_minutes,
  reset_duration_hours,
  updated_at
FROM rate_limit_config;

-- 3.3: Test is_ip_rate_limited function
SELECT * FROM is_ip_rate_limited('203.0.113.50'::inet);

-- 3.4: Count failed attempts by IP (last hour)
SELECT ip_address, COUNT(*) as failed_attempts, MAX(created_at) as latest_attempt
FROM login_attempts
WHERE success = false 
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;

-- 3.5: Insert test failed login attempts from same IP
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('test1@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '5 min'),
  ('test2@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '4 min'),
  ('test3@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '3 min'),
  ('test4@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '2 min'),
  ('test5@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '1 min'),
  ('test6@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW()),
  ('test7@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW()),
  ('test8@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW()),
  ('test9@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW()),
  ('test10@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW());

-- 3.6: Check if IP is now rate limited
SELECT * FROM is_ip_rate_limited('203.0.113.50'::inet);
-- Expected: is_limited = true, minutes_remaining = 28-30

-- 3.7: Clean up test data (for testing purposes)
DELETE FROM login_attempts 
WHERE ip_address = '203.0.113.50'::inet;

-- ============================================================
-- TEST 4: ACCOUNT-BASED RATE LIMITING
-- ============================================================

-- 4.1: Test is_account_rate_limited function
SELECT * FROM is_account_rate_limited('manager-test@dlsu.edu.ph');

-- 4.2: Count failed attempts by email (last day)
SELECT email, COUNT(*) as failed_attempts, MAX(created_at) as latest_attempt
FROM login_attempts
WHERE success = false 
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY email
HAVING COUNT(*) > 3
ORDER BY failed_attempts DESC;

-- 4.3: Insert test failed attempts for same account
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('account-test@dlsu.edu.ph', false, '203.0.113.100'::inet, 'test', true, NOW() - INTERVAL '5 min'),
  ('account-test@dlsu.edu.ph', false, '203.0.113.101'::inet, 'test', true, NOW() - INTERVAL '4 min'),
  ('account-test@dlsu.edu.ph', false, '203.0.113.102'::inet, 'test', true, NOW() - INTERVAL '3 min'),
  ('account-test@dlsu.edu.ph', false, '203.0.113.103'::inet, 'test', true, NOW() - INTERVAL '2 min'),
  ('account-test@dlsu.edu.ph', false, '203.0.113.104'::inet, 'test', true, NOW() - INTERVAL '1 min');

-- 4.4: Check if account is now rate limited
SELECT * FROM is_account_rate_limited('account-test@dlsu.edu.ph');
-- Expected: is_limited = true, minutes_remaining = 28-30

-- 4.5: Check account suspension
SELECT id, email, status FROM users 
WHERE email = 'account-test@dlsu.edu.ph';

-- 4.6: Test account suspension function
SELECT check_and_suspend_account(
  'account-test@dlsu.edu.ph',
  (SELECT id FROM users WHERE email = 'account-test@dlsu.edu.ph')
);

-- 4.7: Verify account suspended
SELECT email, status FROM users 
WHERE email = 'account-test@dlsu.edu.ph';
-- Expected: status = 'suspended'

-- 4.8: Clean up test data
DELETE FROM login_attempts 
WHERE email = 'account-test@dlsu.edu.ph';

-- ============================================================
-- TEST 5: RE-AUTHENTICATION FOR CRITICAL OPERATIONS
-- ============================================================

-- 5.1: Verify admin_reauth_logs table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'admin_reauth_logs';

-- 5.2: Check admin_reauth_logs structure
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'admin_reauth_logs'
ORDER BY ordinal_position;

-- 5.3: View all re-auth attempts
SELECT user_id, action_name, status, verified_at, failed_at, created_at
FROM admin_reauth_logs
ORDER BY created_at DESC LIMIT 20;

-- 5.4: View successful re-auth attempts only
SELECT u.email, arl.action_name, arl.verified_at, arl.ip_address
FROM admin_reauth_logs arl
LEFT JOIN users u ON arl.user_id = u.id
WHERE arl.status = 'verified'
ORDER BY arl.created_at DESC LIMIT 10;

-- 5.5: View failed re-auth attempts
SELECT u.email, arl.action_name, arl.failed_at, arl.ip_address
FROM admin_reauth_logs arl
LEFT JOIN users u ON arl.user_id = u.id
WHERE arl.status = 'failed'
ORDER BY arl.created_at DESC LIMIT 10;

-- 5.6: Check re-auth by action type
SELECT action_name, COUNT(*) as total_attempts,
       COUNT(CASE WHEN status = 'verified' THEN 1 END) as successful,
       COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM admin_reauth_logs
GROUP BY action_name
ORDER BY total_attempts DESC;

-- 5.7: Check admin's re-auth history
SELECT action_name, status, verified_at, created_at
FROM admin_reauth_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@dlsu.edu.ph')
ORDER BY created_at DESC LIMIT 20;

-- 5.8: Test has_recent_reauth function
SELECT has_recent_reauth(
  (SELECT id FROM users WHERE email = 'admin@dlsu.edu.ph'),
  'Update User',
  5
);
-- Expected: true if re-authed within last 5 minutes, false otherwise

-- 5.9: Check audit logs for re-auth actions
SELECT action, details, user_id, created_at
FROM audit_logs
WHERE action LIKE '%reauth%' OR action LIKE '%authenticate%'
ORDER BY created_at DESC LIMIT 20;

-- ============================================================
-- TEST 6: END-TO-END VERIFICATION
-- ============================================================

-- 6.1: Complete audit trail for specific user
SELECT action, resource_type, resource_id, created_at
FROM audit_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@dlsu.edu.ph')
ORDER BY created_at DESC LIMIT 30;

-- 6.2: All failed login attempts in last 24 hours
SELECT email, COUNT(*) as failed_attempts, MAX(created_at) as latest_attempt
FROM login_attempts
WHERE success = false AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email
ORDER BY failed_attempts DESC;

-- 6.3: IPs with suspicious activity
SELECT ip_address, COUNT(*) as total_attempts,
       COUNT(CASE WHEN success = true THEN 1 END) as successful,
       COUNT(CASE WHEN success = false THEN 1 END) as failed,
       MAX(created_at) as latest_attempt
FROM login_attempts
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 2
ORDER BY total_attempts DESC;

-- 6.4: Manager activity summary
SELECT 
  COUNT(DISTINCT CASE WHEN action LIKE '%booking%' THEN 1 END) as booking_actions,
  COUNT(DISTINCT CASE WHEN action LIKE '%schedule%' THEN 1 END) as schedule_actions,
  COUNT(DISTINCT CASE WHEN action LIKE '%room%' THEN 1 END) as room_actions
FROM audit_logs
WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph');

-- 6.5: Re-auth effectiveness metrics
SELECT 
  COUNT(*) as total_reauth_attempts,
  COUNT(CASE WHEN status = 'verified' THEN 1 END) as successful_reauths,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_reauths,
  ROUND(100.0 * COUNT(CASE WHEN status = 'verified' THEN 1 END) / COUNT(*), 2) as success_rate
FROM admin_reauth_logs;

-- 6.6: System health check
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM buildings) as total_buildings,
  (SELECT COUNT(*) FROM classrooms) as total_classrooms,
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT COUNT(*) FROM login_attempts) as total_login_attempts,
  (SELECT COUNT(*) FROM admin_reauth_logs) as total_reauth_attempts,
  (SELECT COUNT(*) FROM audit_logs) as total_audit_logs;

-- ============================================================
-- CLEANUP (USE WITH CAUTION - DEVELOPMENT ONLY)
-- ============================================================

-- DO NOT RUN IN PRODUCTION!

-- Clean up test login attempts
-- DELETE FROM login_attempts WHERE email LIKE 'test%@dlsu.edu.ph';

-- Clean up test re-auth logs
-- DELETE FROM admin_reauth_logs WHERE user_id = (SELECT id FROM users WHERE email = 'test-admin@dlsu.edu.ph');

-- Reset rate limit config to defaults
-- UPDATE rate_limit_config SET 
--   max_failed_attempts = 5,
--   lockout_duration_minutes = 30,
--   reset_duration_hours = 24
-- WHERE id = 1;
