# 🧪 Re-Authentication Testing Guide

## How to Test the Re-Auth Function

This guide covers manual testing, browser testing, and database verification.

---

## ✅ Quick Manual Test (5 minutes)

### Prerequisites
```bash
# 1. Ensure migration is deployed
   Go to Supabase SQL Editor
   Run: SELECT * FROM admin_reauth_logs LIMIT 1;
   Should return: (no error, table exists)

# 2. Start development server
   npm run dev
   
# 3. Login as admin
   Go to http://localhost:3000/auth/login
   Sign in with @dlsu.edu.ph account
   Navigate to /admin/users
```

### Test Steps

**Test 1: Dialog Appears**
```
1. Go to http://localhost:3000/admin/users
2. Find any user in the list
3. Click the "Edit" button (pencil icon)
4. Edit modal opens
5. Change the Role or Status dropdown
6. Click "Update User" button
7. ✅ EXPECTED: Re-auth dialog appears with password field
```

**Test 2: Correct Password**
```
1. Re-auth dialog is showing
2. Enter your correct password
3. Click "Verify & Continue" button
4. ✅ EXPECTED: 
   - Dialog closes
   - User is updated
   - Success toast appears
   - Audit logs created
```

**Test 3: Wrong Password**
```
1. Re-auth dialog is showing
2. Enter WRONG password
3. Click "Verify & Continue" button
4. ✅ EXPECTED:
   - Error message: "Password verification failed"
   - Dialog stays open
   - Password field cleared
   - User is NOT updated
```

**Test 4: Cancel Action**
```
1. Re-auth dialog is showing
2. Click "Cancel" button
3. ✅ EXPECTED:
   - Dialog closes
   - Edit modal closes
   - User is NOT updated
   - No logs created
```

---

## 🔍 Browser Testing (Detailed)

### Test Setup
```javascript
// Open browser console (F12)
// These are the checks to perform

// 1. Check ReAuthDialog component is loaded
console.log('ReAuthDialog available:', !!window.ReAuthDialog)

// 2. Check sessionStorage (after re-auth)
console.log('Session storage:', sessionStorage)
// Should show: reauth_'action_name' with token

// 3. Check network requests
// Open DevTools > Network tab
// Re-auth dialog password submit should POST to:
//   - supabase signInWithPassword
//   - audit_logs insert
```

### Browser Console Tests

**Check 1: Component Loaded**
```javascript
// Go to /admin/users and open console
// Paste this:
const buttons = document.querySelectorAll('button');
const editButtons = Array.from(buttons).filter(b => 
  b.querySelector('svg') && b.textContent.includes('Edit')
);
console.log('Edit buttons found:', editButtons.length);
```

**Check 2: Dialog DOM**
```javascript
// After clicking Edit and changing a field:
const dialog = document.querySelector('[role="dialog"]');
console.log('Dialog visible:', !!dialog);
console.log('Password input:', !!dialog?.querySelector('input[type="password"]'));
console.log('Verify button:', !!dialog?.querySelector('button:contains("Verify")'));
```

**Check 3: SessionStorage After Auth**
```javascript
// After successful re-auth:
console.log('Session keys:', Object.keys(sessionStorage));
// Should include: 'reauth_Update User: ...' or similar

// Check token content:
const token = Object.entries(sessionStorage)
  .find(([k]) => k.startsWith('reauth_'))?.[1];
const tokenData = token ? JSON.parse(atob(token)) : null;
console.log('Token data:', tokenData);
// Should show: { userId, timestamp, action, expiresAt }
```

---

## 📊 Database Verification

### Verify Migration Success

**Query 1: Check Tables**
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'admin_reauth_logs';

-- Expected: Returns 1 row with table_name = 'admin_reauth_logs'
```

**Query 2: Check Functions**
```sql
-- Run in Supabase SQL Editor
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%reauth%';

-- Expected: Returns 2 rows:
--   - log_reauth_attempt (FUNCTION)
--   - has_recent_reauth (FUNCTION)
```

**Query 3: Check Indexes**
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'admin_reauth_logs';

-- Expected: Returns 3 indexes:
--   - idx_admin_reauth_user_id
--   - idx_admin_reauth_action
--   - idx_admin_reauth_status
```

**Query 4: Check RLS Policies**
```sql
SELECT policyname, permissive, roles
FROM pg_policies 
WHERE tablename = 'admin_reauth_logs';

-- Expected: Returns 1 policy with name like "Admins can view..."
```

### View Re-Auth Logs

**View All Attempts**
```sql
SELECT 
  id,
  user_id,
  action_name,
  status,
  ip_address,
  verified_at,
  created_at
FROM admin_reauth_logs
ORDER BY created_at DESC
LIMIT 20;

-- Shows: All re-auth attempts with status (verified/failed/cancelled)
```

**View Specific User's Attempts**
```sql
SELECT 
  action_name,
  status,
  verified_at,
  ip_address,
  created_at
FROM admin_reauth_logs
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- Replace YOUR_USER_ID with actual user ID
```

**View Failed Attempts**
```sql
SELECT 
  u.email,
  arl.action_name,
  arl.created_at,
  COUNT(*) as attempts
FROM admin_reauth_logs arl
LEFT JOIN users u ON arl.user_id = u.id
WHERE arl.status = 'failed'
  AND arl.created_at > NOW() - INTERVAL '1 day'
GROUP BY u.email, arl.action_name, arl.created_at
ORDER BY arl.created_at DESC;

-- Shows: Users with failed re-auth attempts in last 24h
```

**View Verified Attempts**
```sql
SELECT 
  u.email,
  arl.action_name,
  arl.verified_at,
  arl.created_at
FROM admin_reauth_logs arl
LEFT JOIN users u ON arl.user_id = u.id
WHERE arl.status = 'verified'
  AND arl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY arl.created_at DESC;

-- Shows: All successful re-auths in last 24h
```

### Check Audit Trail

**View Update Logs with Re-Auth**
```sql
SELECT 
  u.email,
  al.action,
  al.requires_reauth,
  al.reauth_verified,
  al.details,
  al.timestamp
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.action LIKE 'user_%'
  AND al.timestamp > NOW() - INTERVAL '1 day'
ORDER BY al.timestamp DESC
LIMIT 20;

-- Shows: User updates with re-auth verification status
```

---

## 🎯 Test Scenarios

### Scenario 1: Successful Update (Happy Path)

```
Setup:
  1. npm run dev
  2. Login as admin
  3. Go to /admin/users

Steps:
  1. Click Edit on a user
  2. Change Role from "user" to "admin"
  3. Click "Update User"
  4. Re-auth dialog appears
  5. Enter CORRECT password
  6. Click "Verify & Continue"

Expected Results:
  ✅ Dialog closes
  ✅ Success toast: "User updated successfully"
  ✅ User list refreshes
  ✅ Role changed to "admin"
  ✅ admin_reauth_logs has entry with status='verified'
  ✅ audit_logs has entry with action='user_updated' and reauth_verified=true

SQL Check:
  SELECT * FROM admin_reauth_logs 
  WHERE status = 'verified' 
  ORDER BY created_at DESC LIMIT 1;
  -- Should show: verified_at is NOT NULL
```

### Scenario 2: Wrong Password (Negative Path)

```
Setup:
  1. npm run dev
  2. Login as admin
  3. Go to /admin/users

Steps:
  1. Click Edit on a user
  2. Change Status to "suspended"
  3. Click "Update User"
  4. Re-auth dialog appears
  5. Enter WRONG password
  6. Click "Verify & Continue"

Expected Results:
  ✅ Error message displayed: "Password verification failed"
  ✅ Password field cleared
  ✅ Dialog stays open
  ✅ User is NOT updated
  ✅ Status remains unchanged
  ✅ admin_reauth_logs has entry with status='failed'
  ✅ audit_logs has NO entry for this user

SQL Check:
  SELECT * FROM admin_reauth_logs 
  WHERE status = 'failed' 
  ORDER BY created_at DESC LIMIT 1;
  -- Should show: verified_at is NULL, created_at = NOW()
```

### Scenario 3: Session Expiration (Edge Case)

```
Setup:
  1. npm run dev
  2. Login as admin
  3. Go to /admin/users

Steps:
  1. Click Edit on a user
  2. Change Role
  3. Click "Update User"
  4. Re-auth dialog appears
  5. Enter CORRECT password
  6. Re-auth succeeds, token stored in sessionStorage
  7. Wait 6 minutes (token expires after 5 min)
  8. Try to use expired token

Expected Results:
  ✅ Token is invalid after 5 minutes
  ✅ Re-auth required again
  ✅ No action taken with expired token

Code Check:
  // After successful re-auth
  console.log(sessionStorage.getItem('reauth_Update User'));
  // After 5 minutes:
  const token = JSON.parse(atob(sessionStorage.getItem('reauth_Update User')));
  console.log(Date.now() > token.expiresAt); // true = expired
```

### Scenario 4: Cancel Re-Auth (User Flow)

```
Setup:
  1. npm run dev
  2. Login as admin
  3. Go to /admin/users

Steps:
  1. Click Edit on a user
  2. Change Department
  3. Click "Update User"
  4. Re-auth dialog appears
  5. Click "Cancel" button

Expected Results:
  ✅ Re-auth dialog closes
  ✅ Edit modal closes
  ✅ User is NOT updated
  ✅ Department remains unchanged
  ✅ No logs created
  ✅ sessionStorage is clean

SQL Check:
  SELECT COUNT(*) FROM admin_reauth_logs 
  WHERE action_name LIKE '%Department%'
  AND created_at > NOW() - INTERVAL '1 minute';
  -- Should return: 0 (no logs for cancelled action)
```

---

## 🔒 Security Tests

### Test: No Password Leakage

```javascript
// 1. Open DevTools > Network
// 2. Go to /admin/users
// 3. Edit user and enter password
// 4. Check network request

Expected:
  ✅ Password sent only to Supabase auth endpoint
  ✅ Password NOT sent to your backend
  ✅ Password NOT visible in URL
  ✅ Password NOT logged in console
  ✅ Password NOT stored in sessionStorage
```

### Test: RLS Policy Enforcement

```sql
-- Test 1: Non-admin cannot view logs
-- (Use a non-admin user's session token in your client)
SELECT * FROM admin_reauth_logs;
-- Expected: ERROR - permission denied

-- Test 2: Admin can view logs
-- (Use an admin user's session token)
SELECT * FROM admin_reauth_logs;
-- Expected: Returns rows

-- Test 3: Check RLS is enabled
SELECT table_name, row_security_enabled
FROM information_schema.tables 
WHERE table_name = 'admin_reauth_logs';
-- Expected: row_security_enabled = true
```

### Test: Token Tampering

```javascript
// Try to manually edit token
const fakeToken = btoa(JSON.stringify({
  userId: 'different-user-id',
  timestamp: Date.now(),
  action: 'Update User',
  expiresAt: Date.now() + 5 * 60 * 1000
}));

sessionStorage.setItem('reauth_Update User', fakeToken);

// Try to use it
// Expected: Backend validates token, detects tampering
```

---

## 📈 Performance Tests

### Test: Dialog Response Time

```javascript
// 1. Open DevTools > Performance
// 2. Go to /admin/users
// 3. Start recording
// 4. Click Edit button
// 5. Stop recording
// 6. Analyze

Expected:
  ✓ Dialog renders in < 100ms
  ✓ No layout thrashing
  ✓ No memory leaks
  ✓ Smooth animations
```

### Test: Password Verification Time

```javascript
// Check in DevTools > Network
// When submitting password:

Expected:
  ✓ Request completes in 100-200ms
  ✓ No network errors
  ✓ Proper response status
```

---

## 🐛 Troubleshooting Tests

### Issue: Re-auth Dialog Doesn't Appear

**Test:**
```javascript
// 1. Check component is imported
const page = require('./app/admin/users/page.tsx');
console.log('ReAuthDialog imported:', !!page.ReAuthDialog);

// 2. Check state
const [showReAuth, setShowReAuth] = React.useState(false);
// Should be set to true when action initiated

// 3. Check DOM
console.log('Dialog in DOM:', !!document.querySelector('[role="dialog"]'));
```

### Issue: Password Not Accepted

**Test:**
```sql
-- Verify user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Check if password is correct
-- (Use Supabase auth directly to verify)
```

### Issue: Logs Not Appearing

**Test:**
```sql
-- 1. Check if logs table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'admin_reauth_logs';

-- 2. Check if RLS allows read
SELECT * FROM admin_reauth_logs LIMIT 1;

-- 3. Check if user is admin
SELECT id, email, role FROM users 
WHERE id = current_user_id;
```

---

## ✅ Full Test Checklist

```
□ Migration Deployed
  ✓ Tables created
  ✓ Functions created
  ✓ Indexes created
  ✓ RLS policies created

□ Component Rendering
  ✓ Dialog appears on edit
  ✓ Dialog appears on delete
  ✓ Password field visible
  ✓ Error messages display

□ Functionality
  ✓ Correct password accepted
  ✓ Wrong password rejected
  ✓ Cancel button works
  ✓ Token created after auth
  ✓ Token expires after 5 min

□ Database Logging
  ✓ admin_reauth_logs populated
  ✓ Status field correct
  ✓ IP address captured
  ✓ User agent captured
  ✓ Timestamps accurate

□ Audit Trail
  ✓ audit_logs created
  ✓ reauth_verified field set
  ✓ Action details captured
  ✓ User identification correct

□ Security
  ✓ Password not logged
  ✓ Password not exposed
  ✓ RLS policies enforced
  ✓ Token tampering detected

□ Error Handling
  ✓ Network errors handled
  ✓ Auth errors handled
  ✓ Database errors handled
  ✓ User messages clear
```

---

## 📊 Expected Database State After Testing

### admin_reauth_logs Table
```
Sample row after successful re-auth:
{
  id: 'd8f9cd0b...',
  user_id: 'a1b2c3d4...',
  action_name: 'Update User: John Doe',
  action_details: { old_role: 'user', new_role: 'admin' },
  status: 'verified',
  ip_address: '192.168.1.100',
  user_agent: 'Mozilla/5.0...',
  verified_at: 2024-11-17 10:30:45,
  created_at: 2024-11-17 10:30:40
}

Sample row after failed re-auth:
{
  id: 'e8g9cd0c...',
  user_id: 'a1b2c3d4...',
  action_name: 'Update User: Jane Smith',
  action_details: null,
  status: 'failed',
  ip_address: '192.168.1.101',
  user_agent: 'Mozilla/5.0...',
  verified_at: null,
  created_at: 2024-11-17 10:31:50
}
```

---

## 🎓 Summary

**To test the re-auth function:**

1. **Quick Test (5 min):** Follow the "Quick Manual Test" section
2. **Detailed Test (20 min):** Run through all 4 test scenarios
3. **Security Test (10 min):** Verify security features
4. **Database Check (5 min):** Run verification queries

**Total Testing Time: 40 minutes**

**Key Verification Points:**
- ✅ Dialog appears when expected
- ✅ Password verification works
- ✅ Logs are created correctly
- ✅ Tokens expire properly
- ✅ Security is maintained
- ✅ UI/UX is smooth

You're ready to test! 🚀
