# Comprehensive Testing Guide - All Features

**Date:** November 25, 2025  
**Database:** Supabase (PostgreSQL)  
**Environment:** Development

---

## 📋 Quick Start Testing Checklist

Use this checklist as you test each feature:

- [ ] Test 1: Authentication Attempt Logging
- [ ] Test 2: Manager Dashboard
- [ ] Test 3: Rate Limiting (IP-based)
- [ ] Test 4: Rate Limiting (Account-based)
- [ ] Test 5: Re-authentication Dialog
- [ ] Test 6: End-to-End Manager Workflow

---

## TEST 1: Authentication Attempt Logging

### Prerequisites
- Development server running: `npm run dev`
- Supabase project accessible
- Google OAuth configured

### Test 1.1: Verify login_attempts Table Structure

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Run this query to verify table exists:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'login_attempts';
```

**Expected Result:**
```
table_name
-----------
login_attempts
```

3. Check table structure:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'login_attempts'
ORDER BY ordinal_position;
```

**Expected Columns:**
```
column_name          | data_type
---------------------|----------
id                   | uuid
email                | character varying
success              | boolean
ip_address           | inet
user_agent           | text
error_message        | text
domain_valid         | boolean
created_at           | timestamp
```

---

### Test 1.2: Successful Login Attempt Logging

**Setup:**
1. Start development server: `npm run dev`
2. Navigate to `http://localhost:3000/auth/login`
3. Note the current time (or check browser dev tools Network tab)

**Steps:**
1. Click "Sign in with Google"
2. Use test account: `your-name@dlsu.edu.ph`
3. Complete OAuth flow
4. After redirect to dashboard, note timestamp

**Verification in Supabase:**
```sql
SELECT * FROM login_attempts 
WHERE email = 'your-name@dlsu.edu.ph' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Results:**
```
success: true
error_message: NULL
domain_valid: true
ip_address: (your IP)
user_agent: (browser info)
created_at: (within last minute)
```

✅ **Pass Criteria:**
- `success = true`
- `domain_valid = true`
- `error_message IS NULL`
- `ip_address` is populated
- `user_agent` is populated
- Timestamp is recent

---

### Test 1.3: Failed Login - Invalid Domain

**Setup:**
1. Ensure you have a Google account with non-DLSU email (e.g., gmail.com)
2. Or mock the response in browser dev tools

**Steps:**
1. Go to `http://localhost:3000/auth/login`
2. Click "Sign in with Google"
3. Use non-DLSU email (e.g., `test@gmail.com`)
4. Should redirect to login with error message

**Verification in Supabase:**
```sql
SELECT * FROM login_attempts 
WHERE email = 'test@gmail.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
```
success: false
domain_valid: false
error_message: 'Invalid domain - not @dlsu.edu.ph'
```

✅ **Pass Criteria:**
- `success = false`
- `domain_valid = false`
- `error_message` contains "Invalid domain"

---

### Test 1.4: Verify Audit Log Entries

**Steps:**
1. In Supabase SQL Editor, query audit logs:
```sql
SELECT action, details, ip_address, created_at 
FROM audit_logs 
WHERE action = 'user_login' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Results:**
```
action: 'user_login'
details: {
  "email": "user@dlsu.edu.ph",
  "login_method": "oauth_google",
  "ip_address": "..."
}
ip_address: (your IP)
```

✅ **Pass Criteria:**
- `action = 'user_login'`
- `details.login_method = 'oauth_google'`
- `ip_address` populated
- Timestamp is recent

---

### Test 1.5: Verify Log_Login_Attempt Function

**Purpose:** Ensure the RPC function works correctly

**Steps:**
1. In Supabase SQL Editor, call the function directly:
```sql
SELECT * FROM log_login_attempt(
  'test@dlsu.edu.ph',
  true,
  '192.168.1.1'::inet,
  'Mozilla/5.0...',
  null,
  true
);
```

**Expected Result:**
- Function executes without error
- New record appears in `login_attempts` table

✅ **Pass Criteria:**
- No errors returned
- Record inserted successfully
- Can query it back

---

### Test 1.6: View User Login History in Admin Panel

**Setup:**
- Must be logged in as admin
- Navigate to `/admin/audit-logs` (if available)

**Steps:**
1. Go to Admin dashboard
2. View audit logs
3. Filter by action = 'user_login'
4. Should see recent login attempts

✅ **Pass Criteria:**
- Can view login attempts
- Shows email, timestamp, IP
- Shows success/failure status

---

## TEST 2: Manager Dashboard Functionality

### Prerequisites
- Admin user who can create test manager account
- Manager account created in database with role='manager'
- Manager assigned to at least one building

### Test 2.1: Manager Dashboard Loads

**Setup:**
1. Start dev server: `npm run dev`
2. Have a manager account ready (or create one in `/admin/users`)
3. Log in as manager

**Steps:**
1. Navigate to `http://localhost:3000/manager`
2. Wait for page to load

**Expected Results:**
```
✅ Page loads without errors
✅ Shows "Manager Dashboard" header
✅ Shows welcome message with manager name
✅ Shows statistics cards
✅ Shows quick action cards
✅ Shows assigned buildings list
```

✅ **Pass Criteria:**
- No 404 or 500 errors
- Page displays within 2 seconds
- All UI elements visible

---

### Test 2.2: Verify Statistics Cards

**Steps:**
1. On manager dashboard, check each statistics card:
   - Assigned Buildings count
   - Classrooms count
   - Pending Bookings count
   - Schedule Conflicts count

**Verification in Database:**
```sql
-- Check assigned buildings
SELECT COUNT(*) FROM user_buildings 
WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph');

-- Check classrooms in those buildings
SELECT COUNT(*) FROM classrooms 
WHERE building_id IN (
  SELECT building_id FROM user_buildings 
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
);

-- Check pending bookings
SELECT COUNT(*) FROM bookings 
WHERE status = 'pending'
  AND classroom_id IN (
    SELECT id FROM classrooms 
    WHERE building_id IN (
      SELECT building_id FROM user_buildings 
      WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
    )
  );
```

✅ **Pass Criteria:**
- Statistics cards show correct counts
- Numbers match database queries

---

### Test 2.3: Manager Schedule Management

**Steps:**
1. Click "Manage Schedules" card on dashboard
2. Navigate to `/manager/schedules`
3. Wait for page to load

**Expected Results:**
```
✅ Page shows "Manage Schedules" header
✅ "Add Schedule" button visible
✅ List of existing schedules displayed
✅ Each schedule shows: classroom, day, time, subject, instructor
```

**Create Schedule:**
1. Click "Add Schedule" button
2. Fill in form:
   - Classroom: Select from dropdown
   - Day of Week: Monday-Saturday
   - Start Time: 08:00
   - End Time: 09:30
   - Subject Code: CS101
   - Instructor Name: John Doe
3. Click "Create Schedule"

**Expected Results:**
```
✅ Success toast notification appears
✅ Modal closes
✅ New schedule appears in list
✅ Created timestamp is recent
```

**Verification in Database:**
```sql
SELECT * FROM class_schedules 
WHERE subject_code = 'CS101'
ORDER BY created_at DESC LIMIT 1;
```

✅ **Pass Criteria:**
- Schedule appears in list
- Database record created
- All fields match input

---

### Test 2.4: Manager Room Management

**Steps:**
1. Click "Manage Rooms" card on dashboard
2. Navigate to `/manager/rooms`
3. Wait for page to load

**Expected Results:**
```
✅ Page shows "Manage Rooms" header
✅ Grid of classrooms displayed
✅ Each room shows: building name, room number, floor, capacity, amenities, status
✅ Status badges are color-coded
```

**Edit Room:**
1. Click "Edit" button on any room
2. Modal opens with room details
3. Modify:
   - Capacity: Change to different number
   - Amenities: Add "Smart Board, AC"
   - Status: Change to "Maintenance"
4. Click "Update Room"

**Expected Results:**
```
✅ Success toast notification appears
✅ Modal closes
✅ Room card updates with new values
```

**Verification in Database:**
```sql
SELECT capacity, amenities, status FROM classrooms 
WHERE id = 'room-id-here';
```

✅ **Pass Criteria:**
- Changes appear immediately in UI
- Database updated
- New values persist after refresh

---

### Test 2.5: Manager Booking Management

**Steps:**
1. Click "Booking Requests" card on dashboard
2. Navigate to `/manager/bookings`
3. Wait for page to load

**Expected Results:**
```
✅ Page shows "Booking Requests" header
✅ List of pending bookings displayed
✅ Each booking shows: student name, classroom, date, time, purpose
```

**Review Booking:**
1. Click on any pending booking
2. Detail modal opens showing full information:
   - Classroom name and code
   - Student name and email
   - Booking date and time
   - Purpose
3. View "Approve" and "Reject" buttons

**Approve Booking:**
1. Click "Approve" button
2. Request processes

**Expected Results:**
```
✅ Success notification appears
✅ Booking removed from pending list
✅ Status changes to "confirmed"
```

**Verification in Database:**
```sql
SELECT status FROM bookings 
WHERE id = 'booking-id-here';

-- Should return: confirmed
```

✅ **Pass Criteria:**
- Booking status updates
- Removed from pending list
- Database reflects change

---

### Test 2.6: Access Control

**Setup:**
- Regular user (role='user') logged in
- Manager/Admin still accessible in another tab

**Steps:**
1. As regular user, try to navigate to `/manager`
2. Observe behavior

**Expected Results:**
```
✅ Redirect to /dashboard (not /manager)
✅ No error message displayed to user
✅ Audit log shows unauthorized_access attempt
```

**Verification in Database:**
```sql
SELECT action, details FROM audit_logs 
WHERE action = 'unauthorized_access' 
AND details->>'reason' = 'not manager/admin'
ORDER BY created_at DESC LIMIT 1;
```

✅ **Pass Criteria:**
- User cannot access manager routes
- Redirected to dashboard
- Unauthorized access logged

---

## TEST 3: IP-Based Rate Limiting

### Prerequisites
- Understanding of rate limiting: 10 failed attempts per hour → 30-min lockout
- Ability to test from multiple IPs or use proxy

### Test 3.1: Verify Rate Limiting Configuration

**Steps:**
1. In Supabase SQL Editor:
```sql
SELECT * FROM rate_limit_config;
```

**Expected Results:**
```
id                    | 1
max_failed_attempts   | 5
lockout_duration_minutes | 30
reset_duration_hours  | 24
```

✅ **Pass Criteria:**
- Table exists
- Default values are set

---

### Test 3.2: Test IP Rate Limiting Function

**Steps:**
1. In Supabase SQL Editor, first create test failed attempts:
```sql
-- Insert 10 failed login attempts from same IP
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
```

2. Call IP rate limiting function:
```sql
SELECT * FROM is_ip_rate_limited('203.0.113.50'::inet);
```

**Expected Results:**
```
is_limited: true
minutes_remaining: ~30 (between 28-30)
```

✅ **Pass Criteria:**
- Returns `is_limited = true`
- Minutes remaining is between 28-30

---

### Test 3.3: Test IP Rate Limiting in OAuth Flow

**Setup:**
- Use VPN or proxy to spoof same IP address
- Have multiple test accounts ready

**Steps:**
1. Clear `login_attempts` table (development only):
```sql
DELETE FROM login_attempts 
WHERE ip_address = '203.0.113.50'::inet;
```

2. Attempt login 10 times from same IP with different accounts:
   - First attempt: Should succeed or fail based on valid domain
   - Attempts 6-10: Should be blocked with rate limit message

**Expected Behavior:**
- First 10 attempts: Normal processing
- After 10th attempt: IP blocked for 30 minutes
- Error message: "IP Rate Limited. Please try again in X minutes"
- Redirect to login with error: `?error=rate_limited&minutes=30`

**Verification in Browser:**
```
1. Check error message displays correctly
2. Refresh page - should still show rate limit error
3. After 30 minutes (or wait in test), try again - should work
```

**Verification in Database:**
```sql
SELECT COUNT(*), success FROM login_attempts 
WHERE ip_address = '203.0.113.50'::inet 
GROUP BY success;
```

✅ **Pass Criteria:**
- 10+ failed attempts logged
- IP blocked after 10 attempts
- User sees error message
- IP unlocked after 30 minutes

---

## TEST 4: Account-Based Rate Limiting

### Prerequisites
- Same as IP-based testing
- Understanding of account lockout: 5 failed per day → 30-min lockout

### Test 4.1: Test Account Rate Limiting Function

**Steps:**
1. Insert test failed login attempts for same email:
```sql
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('manager-test@dlsu.edu.ph', false, '203.0.113.100'::inet, 'test', true, NOW() - INTERVAL '5 min'),
  ('manager-test@dlsu.edu.ph', false, '203.0.113.101'::inet, 'test', true, NOW() - INTERVAL '4 min'),
  ('manager-test@dlsu.edu.ph', false, '203.0.113.102'::inet, 'test', true, NOW() - INTERVAL '3 min'),
  ('manager-test@dlsu.edu.ph', false, '203.0.113.103'::inet, 'test', true, NOW() - INTERVAL '2 min'),
  ('manager-test@dlsu.edu.ph', false, '203.0.113.104'::inet, 'test', true, NOW() - INTERVAL '1 min');
```

2. Call account rate limiting function:
```sql
SELECT * FROM is_account_rate_limited('manager-test@dlsu.edu.ph');
```

**Expected Results:**
```
is_limited: true
minutes_remaining: ~30
```

✅ **Pass Criteria:**
- Returns `is_limited = true`
- Minutes remaining is between 28-30

---

### Test 4.2: Test Account Suspension

**Steps:**
1. Check current user status:
```sql
SELECT status FROM users 
WHERE email = 'manager-test@dlsu.edu.ph';
```

2. Insert 5 failed attempts (see Test 4.1)

3. Call suspension check function:
```sql
SELECT check_and_suspend_account(
  'manager-test@dlsu.edu.ph',
  (SELECT id FROM users WHERE email = 'manager-test@dlsu.edu.ph')
);
```

4. Check status again:
```sql
SELECT status FROM users 
WHERE email = 'manager-test@dlsu.edu.ph';
```

**Expected Results:**
```
status: 'suspended'  (changed from 'active')
```

✅ **Pass Criteria:**
- Account status changes to 'suspended'
- Cannot login while suspended
- Status visible in admin panel

---

### Test 4.3: Account Unlock After Lockout Period

**Steps:**
1. After locking account (Test 4.2), wait for lockout duration
   - In test: Can modify timestamps to simulate waiting
2. Try to login again

**Expected Behavior:**
- Can login again after 30 minutes
- Lockout automatically lifted

**Simulation in Database:**
```sql
-- Update last failed attempt to 31 minutes ago
UPDATE login_attempts 
SET created_at = NOW() - INTERVAL '31 minutes'
WHERE email = 'manager-test@dlsu.edu.ph'
ORDER BY created_at DESC LIMIT 1;

-- Now try login - should work
```

✅ **Pass Criteria:**
- Can login after lockout expires
- No manual unlock required

---

## TEST 5: Re-authentication for Critical Operations

### Prerequisites
- Logged in as admin user
- Manager account exists that you can edit
- Migration 014 is deployed

### Test 5.1: Verify admin_reauth_logs Table

**Steps:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'admin_reauth_logs';
```

**Expected Result:**
```
admin_reauth_logs
```

**Check structure:**
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'admin_reauth_logs'
ORDER BY ordinal_position;
```

✅ **Pass Criteria:**
- Table exists
- Has all required columns

---

### Test 5.2: Re-auth Dialog Appears for User Edit

**Setup:**
1. Log in as admin
2. Navigate to `/admin/users`
3. Find a user to edit (or create test user)

**Steps:**
1. Click "Edit" button on any user
2. Change user role (e.g., from "user" to "manager")
3. Click "Update User"

**Expected Behavior:**
```
✅ Re-Auth dialog appears immediately
✅ Shows "Confirm Critical Action" title
✅ Shows security warning
✅ Shows action name: "Update User"
✅ Shows password input field
✅ Shows "Verify & Continue" and "Cancel" buttons
```

✅ **Pass Criteria:**
- Dialog appears before action executed
- Cannot proceed without re-auth
- All UI elements visible

---

### Test 5.3: Password Verification (Wrong Password)

**Steps:**
1. Re-auth dialog is open (from Test 5.2)
2. Enter WRONG password
3. Click "Verify & Continue"

**Expected Behavior:**
```
✅ Button shows loading spinner briefly
✅ Error message appears: "Password verification failed. Please try again."
✅ Password field is cleared
✅ Dialog remains open
✅ User action NOT executed
```

**Verification in Database:**
```sql
SELECT action_name, status FROM admin_reauth_logs 
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@dlsu.edu.ph')
ORDER BY created_at DESC LIMIT 1;
```

**Expected:**
```
action_name: Update User
status: failed
```

✅ **Pass Criteria:**
- Error shown to user
- Password not accepted
- Attempt logged as "failed"

---

### Test 5.4: Password Verification (Correct Password)

**Steps:**
1. Re-auth dialog is open
2. Enter CORRECT password (your Google OAuth password - but this uses Supabase auth, so you may need to set one)
3. Click "Verify & Continue"

**Expected Behavior:**
```
✅ Loading spinner shows briefly
✅ Dialog closes
✅ User is updated
✅ Success toast: "User updated successfully"
✅ Updated user appears in list with new role
```

**Verification in Database:**
```sql
-- Check audit log
SELECT action, details FROM audit_logs 
WHERE action LIKE '%update%' AND action LIKE '%user%'
ORDER BY created_at DESC LIMIT 1;

-- Check re-auth log
SELECT action_name, status, verified_at FROM admin_reauth_logs 
WHERE action_name = 'Update User'
ORDER BY created_at DESC LIMIT 1;

-- Check user role was updated
SELECT email, role FROM users 
WHERE email = 'user-being-edited@dlsu.edu.ph';
```

**Expected:**
```
audit_logs.action: 'admin_update_user_re_authenticated'
admin_reauth_logs.status: 'verified'
admin_reauth_logs.verified_at: (recent timestamp)
users.role: (new role value)
```

✅ **Pass Criteria:**
- Re-auth succeeds
- User action executes
- Changes persist in database
- Audit trail complete

---

### Test 5.5: Re-auth Session Token Expiration

**Setup:**
- Successfully completed re-auth (Test 5.4)
- Note the timestamp

**Steps:**
1. Complete a re-auth successfully
2. Wait 6 minutes
3. Try to edit another user

**Expected Behavior:**
```
✅ Re-auth dialog appears again
✅ Cannot use previous session token
✅ Must enter password again
```

**Why:** Session tokens expire after 5 minutes

✅ **Pass Criteria:**
- Token expires after 5-6 minutes
- Must re-authenticate for each action
- No token reuse

---

### Test 5.6: Deactivate User with Re-auth

**Steps:**
1. Navigate to `/admin/users`
2. Find a user
3. Click delete/deactivate button
4. Re-auth dialog appears
5. Enter correct password
6. Click "Verify & Continue"

**Expected Behavior:**
```
✅ Re-auth dialog appears
✅ After password verified, user is deactivated
✅ User status changes to 'inactive' or 'suspended'
✅ User removed from active users list
✅ Success notification shown
```

**Verification in Database:**
```sql
SELECT email, status FROM users 
WHERE email = 'user-to-deactivate@dlsu.edu.ph';
```

✅ **Pass Criteria:**
- User status changes
- Change logged in audit_logs
- Re-auth logged in admin_reauth_logs

---

## TEST 6: End-to-End Manager Workflow

### Complete workflow testing across all features

**Scenario:** Manager approves a booking and updates room details

**Steps:**

1. **Login as Manager**
   - Navigate to login
   - Sign in with manager account
   - Verify login logged in login_attempts table

2. **View Dashboard**
   - Navigate to `/manager`
   - Verify all statistics correct
   - Verify assigned buildings displayed

3. **Review Pending Bookings**
   - Click "Booking Requests"
   - See pending bookings
   - Click on one booking
   - Review details

4. **Approve Booking**
   - Click "Approve"
   - See success notification
   - Booking removed from pending list
   - Verify in database: status = 'confirmed'

5. **Update Room Details**
   - Click "Manage Rooms"
   - Find a room
   - Click "Edit"
   - Update capacity: 50 → 45
   - Update status: available → maintenance
   - Click "Update Room"
   - Verify changes in list
   - Verify in database

6. **Create Schedule**
   - Click "Manage Schedules"
   - Click "Add Schedule"
   - Fill in form
   - Submit
   - Verify in list
   - Verify in database

7. **Logout**
   - Logout successfully
   - Verify login_attempts shows logout event (if tracked)

**Final Verifications:**
```sql
-- All manager actions logged
SELECT action, resource_type, user_id FROM audit_logs 
WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
ORDER BY created_at DESC LIMIT 10;

-- Bookings updated
SELECT status FROM bookings WHERE status = 'confirmed';

-- Rooms updated
SELECT capacity, status FROM classrooms;

-- Schedules created
SELECT * FROM class_schedules ORDER BY created_at DESC LIMIT 5;
```

✅ **Pass Criteria:**
- All actions execute without errors
- Database correctly updated
- Audit logs show all actions
- Manager cannot re-auth (no admin)
- Cannot access admin routes

---

## Summary Testing Checklist

- [ ] Test 1.1: login_attempts table exists
- [ ] Test 1.2: Successful login logged
- [ ] Test 1.3: Invalid domain logged as failed
- [ ] Test 1.4: Audit logs created
- [ ] Test 1.5: log_login_attempt function works
- [ ] Test 1.6: Can view logs in admin panel
- [ ] Test 2.1: Manager dashboard loads
- [ ] Test 2.2: Statistics cards accurate
- [ ] Test 2.3: Create/delete schedules works
- [ ] Test 2.4: Update rooms works
- [ ] Test 2.5: Approve/reject bookings works
- [ ] Test 2.6: Access control enforced
- [ ] Test 3.1: Rate config exists
- [ ] Test 3.2: is_ip_rate_limited function works
- [ ] Test 3.3: IP blocked after 10 attempts
- [ ] Test 4.1: is_account_rate_limited function works
- [ ] Test 4.2: Account suspended on limit
- [ ] Test 4.3: Auto-unlock after timeout
- [ ] Test 5.1: admin_reauth_logs table exists
- [ ] Test 5.2: Re-auth dialog appears
- [ ] Test 5.3: Wrong password rejected
- [ ] Test 5.4: Correct password succeeds
- [ ] Test 5.5: Session token expires
- [ ] Test 5.6: Deactivate requires re-auth
- [ ] Test 6: End-to-end workflow succeeds

---

## Troubleshooting

### Issue: login_attempts table doesn't exist
**Solution:** Run migration 011
```bash
# In Supabase SQL Editor:
# Copy and paste content of supabase/migrations/011_login_tracking.sql
```

### Issue: Rate limiting functions not found
**Solution:** Run migration 013
```bash
# In Supabase SQL Editor:
# Copy and paste content of supabase/migrations/013_rate_limiting.sql
```

### Issue: admin_reauth_logs table doesn't exist
**Solution:** Run migration 014
```bash
# In Supabase SQL Editor:
# Copy and paste content of supabase/migrations/014_reauthentication.sql
```

### Issue: Re-auth dialog doesn't appear
**Solution:** Check that:
- Migration 014 is deployed
- ReAuthDialog component is imported in `app/admin/users/page.tsx`
- `showReAuthDialog` state is set to true on edit action

### Issue: Rate limiting not working
**Solution:** Verify:
- `rate_limit_config` table has correct values
- `login_attempts` table populating correctly
- Functions called in `app/auth/callback/route.ts`
- Check browser console for errors

### Issue: Manager dashboard shows no data
**Solution:** Verify:
- User has role = 'manager' in database
- `user_buildings` table has entries for this manager
- Assigned buildings exist in `buildings` table
- Classrooms exist in `classrooms` table

---

## Quick Test Commands

Copy and paste these into Supabase SQL Editor:

**Check all tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('login_attempts', 'admin_reauth_logs', 'rate_limit_config')
ORDER BY table_name;
```

**View recent login attempts:**
```sql
SELECT email, success, error_message, created_at FROM login_attempts 
ORDER BY created_at DESC LIMIT 20;
```

**View recent re-auth attempts:**
```sql
SELECT u.email, arl.action_name, arl.status, arl.verified_at 
FROM admin_reauth_logs arl
LEFT JOIN users u ON arl.user_id = u.id
ORDER BY arl.created_at DESC LIMIT 20;
```

**View manager audit logs:**
```sql
SELECT action, resource_type, created_at 
FROM audit_logs 
WHERE action LIKE '%manager%' OR action LIKE '%booking%'
ORDER BY created_at DESC LIMIT 20;
```

**Test rate limit config:**
```sql
SELECT * FROM rate_limit_config;
```

---

**Last Updated:** November 25, 2025  
**Status:** Ready for Testing  
**Next Step:** Start with Test 1.1
