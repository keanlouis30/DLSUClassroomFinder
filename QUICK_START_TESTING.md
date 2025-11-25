# Quick Start Testing - Step by Step

**Date:** November 25, 2025  
**Estimated Time:** 2-3 hours total  
**Difficulty:** Beginner-Friendly

---

## Pre-Testing Checklist

Before you start testing, verify:

- [ ] Development server running: `npm run dev`
- [ ] Can access Supabase Dashboard
- [ ] Have access to SQL Editor
- [ ] Have at least 2 test accounts (1 admin, 1 manager, 1 user)
- [ ] Migrations 011, 013, 014 deployed
- [ ] Google OAuth configured
- [ ] Browser dev tools open (F12)

---

## PART 1: Testing Authentication Attempt Logging (30 minutes)

### Step 1: Verify Tables Exist (5 min)

1. Open Supabase Dashboard → SQL Editor
2. Paste and run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'login_attempts';
```

3. You should see:
```
login_attempts
```

✅ **Pass**: Table exists  
❌ **Fail**: Run migration 011

---

### Step 2: Successful Login Test (10 min)

1. Open browser to `http://localhost:3000/auth/login`
2. Click "Sign in with Google"
3. Login with your test account: `test-user@dlsu.edu.ph`
4. Wait for redirect to dashboard
5. In Supabase SQL Editor, run:
```sql
SELECT email, success, domain_valid, error_message 
FROM login_attempts 
WHERE email = 'test-user@dlsu.edu.ph'
ORDER BY created_at DESC LIMIT 1;
```

6. You should see:
```
email: test-user@dlsu.edu.ph
success: true
domain_valid: true
error_message: NULL
```

✅ **Pass**: Successful login logged  
❌ **Fail**: Check browser console for errors

---

### Step 3: Invalid Domain Test (10 min)

1. If you have a Gmail account, test login with it
2. Otherwise, in browser dev tools Network tab, intercept and modify the response
3. Try to login with non-DLSU email
4. Should see error: "Please sign in with your @dlsu.edu.ph email address"
5. In Supabase SQL Editor:
```sql
SELECT email, success, domain_valid, error_message 
FROM login_attempts 
WHERE domain_valid = false
ORDER BY created_at DESC LIMIT 1;
```

6. Should see:
```
domain_valid: false
error_message: Invalid domain - not @dlsu.edu.ph
```

✅ **Pass**: Failed attempt logged  
❌ **Fail**: Check if domain validation in callback

---

### Step 4: Verify Audit Logs (5 min)

In Supabase SQL Editor:
```sql
SELECT action, details 
FROM audit_logs 
WHERE action = 'user_login'
ORDER BY timestamp DESC LIMIT 1;
```

You should see an entry with `login_method: 'oauth_google'`

✅ **Pass**: Audit log created  
❌ **Fail**: Check if audit log insertion in callback

---

## PART 2: Testing Manager Dashboard (45 minutes)

### Step 5: Manager Account Setup (10 min)

**First, set yourself as admin in the app:**

1. Open Supabase SQL Editor
2. Find your user ID (replace `your-email@dlsu.edu.ph` with your actual email):
```sql
SELECT id, email, role FROM users WHERE email = 'your-email@dlsu.edu.ph';
```

3. Update your role to admin:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@dlsu.edu.ph';
```

4. Logout and login again to refresh your role

---

**Now create a test manager account:**

1. Navigate to `/admin/users`
2. Click "Create User" with these details:
   - Email: `manager@dlsu.edu.ph`
   - Role: Manager
   - Name: Test Manager
   - ID Number: 123456
   - Click "Create User"

3. Assign buildings to manager:
```sql
-- In Supabase SQL Editor
-- Get manager ID
SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph';

-- Get building ID
SELECT id FROM buildings LIMIT 1;

-- Insert user_building record
INSERT INTO user_buildings (user_id, building_id)
VALUES (
  (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph'),
  (SELECT id FROM buildings LIMIT 1)
);
```

✅ **Pass**: You're admin and manager account created with assigned building

---

### Step 6: Manager Dashboard Loads (5 min)

1. Logout as admin
2. Login as manager: `manager@dlsu.edu.ph`
3. Navigate to `http://localhost:3000/manager`

**Verify:**
- [ ] Page loads without errors
- [ ] Shows "Manager Dashboard" title
- [ ] Shows manager name in welcome
- [ ] Shows statistics cards (Buildings: 1+)
- [ ] Shows quick action cards (Schedules, Rooms, Bookings)
- [ ] Shows assigned buildings list

✅ **Pass**: All elements visible  
❌ **Fail**: Check browser console for errors

---

### Step 7: Create Test Data (10 min)

Create a test schedule to see in manager dashboard:

```sql
-- In Supabase SQL Editor
-- Get a classroom ID in manager's building
SELECT c.id, c.room_number FROM classrooms c
WHERE c.building_id IN (
  SELECT building_id FROM user_buildings 
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
) LIMIT 1;

-- Insert test schedule (replace classroom_id)
INSERT INTO class_schedules (classroom_id, day_of_week, start_time, end_time, subject_code, instructor_name)
VALUES (
  'your-classroom-id',
  'Monday',
  '08:00',
  '09:30',
  'TEST101',
  'Test Instructor'
);
```

---

### Step 8: Test Schedule Management (10 min)

1. On manager dashboard, click "Manage Schedules"
2. Should see the test schedule you created
3. Try creating a new schedule:
   - Click "Add Schedule"
   - Fill in form
   - Click "Create Schedule"
4. Check if schedule appears in list

**Verification:**
```sql
SELECT subject_code FROM class_schedules 
WHERE subject_code LIKE 'TEST%' OR subject_code LIKE 'NEW%'
ORDER BY created_at DESC LIMIT 1;
```

✅ **Pass**: Schedule created and visible  
❌ **Fail**: Check API endpoint `/api/manager/schedules`

---

### Step 9: Test Room Management (10 min)

1. Click "Manage Rooms"
2. Should see classrooms in manager's buildings
3. Click "Edit" on any room
4. Change capacity: add 10
5. Add amenities: "Smart Board, AC"
6. Change status to "Maintenance"
7. Click "Update Room"

**Verification:**
```sql
SELECT capacity, amenities, status FROM classrooms 
WHERE status = 'maintenance'
LIMIT 1;
```

✅ **Pass**: Room updated  
❌ **Fail**: Check API endpoint `/api/manager/rooms/{id}`

---

### Step 10: Test Booking Management (10 min)

First, create a test booking:

```sql
-- Get manager's classroom
SELECT c.id FROM classrooms c
WHERE c.building_id IN (
  SELECT building_id FROM user_buildings 
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
) LIMIT 1;

-- Create test booking (replace classroom_id)
INSERT INTO bookings (user_id, classroom_id, booking_date, start_time, end_time, purpose, status)
VALUES (
  (SELECT id FROM users WHERE email = 'test-user@dlsu.edu.ph'),
  'your-classroom-id',
  CURRENT_DATE,
  '14:00',
  '15:30',
  'Study',
  'pending'
);
```

Then test in UI:

1. Click "Booking Requests"
2. Should see pending booking
3. Click on booking to see details
4. Click "Approve"
5. Booking should disappear from pending list

**Verification:**
```sql
SELECT status FROM bookings 
WHERE purpose = 'Study'
ORDER BY created_at DESC LIMIT 1;
-- Should show: confirmed
```

✅ **Pass**: Booking approved  
❌ **Fail**: Check API endpoint `/api/manager/bookings/{id}/approve`

---

## PART 3: Testing Rate Limiting (30 minutes)

### Step 11: Verify Rate Limit Configuration (5 min)

```sql
SELECT * FROM rate_limit_config;
```

Should see:
```
max_failed_attempts: 5
lockout_duration_minutes: 30
```

✅ **Pass**: Config exists  
❌ **Fail**: Run migration 013

---

### Step 12: Test IP Rate Limiting (15 min)

**WARNING: This will lock you out temporarily. Use a test IP or VPN.**

1. Get current IP:
```bash
# Command line
curl https://api.ipify.org
# Note the IP address
```

2. Create 10 failed login attempts from this IP:
```sql
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('fail1@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail2@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail3@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail4@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail5@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail6@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail7@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail8@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail9@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW()),
  ('fail10@dlsu.edu.ph', false, 'YOUR.IP.HERE'::inet, 'test', true, NOW());
```

3. Check if IP is rate limited:
```sql
SELECT * FROM is_ip_rate_limited('YOUR.IP.HERE'::inet);
```

Should see:
```
is_limited: true
minutes_remaining: 28-30
```

4. Try to login from this IP - should see error message

**Verification:**
```sql
SELECT * FROM login_attempts WHERE ip_address = 'YOUR.IP.HERE'::inet;
-- Should show 10+ failed attempts
```

✅ **Pass**: IP blocked after 10 attempts  
❌ **Fail**: Check is_ip_rate_limited function

---

### Step 13: Test Account Rate Limiting (10 min)

1. Create 5 failed attempts for same email:
```sql
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('locktest@dlsu.edu.ph', false, '203.0.113.1'::inet, 'test', true, NOW() - INTERVAL '5 min'),
  ('locktest@dlsu.edu.ph', false, '203.0.113.2'::inet, 'test', true, NOW() - INTERVAL '4 min'),
  ('locktest@dlsu.edu.ph', false, '203.0.113.3'::inet, 'test', true, NOW() - INTERVAL '3 min'),
  ('locktest@dlsu.edu.ph', false, '203.0.113.4'::inet, 'test', true, NOW() - INTERVAL '2 min'),
  ('locktest@dlsu.edu.ph', false, '203.0.113.5'::inet, 'test', true, NOW());
```

2. Check if account is locked:
```sql
SELECT * FROM is_account_rate_limited('locktest@dlsu.edu.ph');
```

Should return:
```
is_limited: true
minutes_remaining: 28-30
```

3. Verify account suspended:
```sql
SELECT status FROM users WHERE email = 'locktest@dlsu.edu.ph';
-- Should show: suspended
```

✅ **Pass**: Account locked and suspended  
❌ **Fail**: Check is_account_rate_limited function

---

### Step 14: Cleanup Rate Limiting Test (5 min)

Remove test data:
```sql
DELETE FROM login_attempts WHERE email LIKE 'fail%@dlsu.edu.ph';
DELETE FROM login_attempts WHERE email = 'locktest@dlsu.edu.ph';
```

---

## PART 4: Testing Re-Authentication (30 minutes)

### Step 15: Verify Re-Auth Setup (5 min)

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'admin_reauth_logs';
```

Should show: `admin_reauth_logs`

✅ **Pass**: Table exists  
❌ **Fail**: Run migration 014

---

### Step 16: Test Re-Auth on User Edit (15 min)

1. Login as admin: `admin@dlsu.edu.ph`
2. Navigate to `/admin/users`
3. Find a user to edit (or use manager account from earlier)
4. Click "Edit" button
5. Change role from "Manager" to "User"
6. Click "Update User"

**Expected: Re-Auth dialog appears**

---

### Step 17: Test Wrong Password (5 min)

1. Dialog is open
2. Enter WRONG password
3. Click "Verify & Continue"

**Expected:**
- Error message: "Password verification failed"
- Password field cleared
- Dialog stays open
- User NOT updated

**Verification:**
```sql
SELECT action_name, status FROM admin_reauth_logs 
WHERE action_name = 'Update User'
ORDER BY created_at DESC LIMIT 1;
-- Should show: status = 'failed'
```

✅ **Pass**: Wrong password rejected  
❌ **Fail**: Check ReAuthDialog component

---

### Step 18: Test Correct Password (5 min)

1. Dialog is open
2. Enter your Supabase password (created during signup, or check email)
3. Click "Verify & Continue"

**Expected:**
- Dialog closes
- Success notification
- User role updated to "User"

**Verification:**
```sql
-- Check user was updated
SELECT role FROM users WHERE email = 'manager@dlsu.edu.ph';
-- Should show: user

-- Check re-auth was logged
SELECT action_name, status, verified_at FROM admin_reauth_logs 
WHERE action_name = 'Update User'
ORDER BY created_at DESC LIMIT 1;
-- Should show: status = 'verified', verified_at = recent timestamp
```

✅ **Pass**: Re-auth succeeds and user updated  
❌ **Fail**: Check password verification logic

---

## PART 5: Final Verification (15 minutes)

### Step 19: Complete Audit Trail

```sql
-- View all recent actions by admin
SELECT action, resource_type, created_at 
FROM audit_logs 
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@dlsu.edu.ph')
ORDER BY created_at DESC LIMIT 20;
```

Should see:
- user_login actions
- admin_*_re_authenticated actions
- update_user actions

✅ **Pass**: All actions logged

---

### Step 20: System Health Check

```sql
SELECT 
  (SELECT COUNT(*) FROM login_attempts) as total_login_attempts,
  (SELECT COUNT(*) FROM admin_reauth_logs) as total_reauth_logs,
  (SELECT COUNT(*) FROM audit_logs) as total_audit_logs,
  (SELECT COUNT(*) FROM class_schedules) as total_schedules,
  (SELECT COUNT(*) FROM bookings) as total_bookings;
```

All counts should be > 0, showing activity was logged

✅ **Pass**: System logging working

---

## Summary

| Feature | Status |
|---------|--------|
| Auth Logging | ✅ Working |
| Manager Dashboard | ✅ Working |
| Rate Limiting | ✅ Working |
| Re-Auth | ✅ Working |

---

## Common Issues & Solutions

**Issue: Re-auth dialog doesn't appear**
- Solution: Check ReAuthDialog import in `/admin/users/page.tsx`

**Issue: Rate limiting doesn't work**
- Solution: Check that functions are called in `app/auth/callback/route.ts`

**Issue: Manager dashboard shows no data**
- Solution: Verify manager account created and assigned buildings

**Issue: "API endpoint not found" error**
- Solution: Need to create API handlers. See TESTING_GUIDE.md for endpoint list

---

**Total Testing Time:** 2-3 hours  
**Difficulty:** Beginner-Friendly  
**Next Step:** Fix any failing tests using solutions in TESTING_GUIDE.md

Good luck! 🎉
