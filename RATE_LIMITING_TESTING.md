# Rate Limiting Testing Guide

**For Account Lockout & Rate Limiting Feature (Requirement #3)**

---

## Overview

Your system has **two types of rate limiting**:

1. **IP-based Rate Limiting**: Blocks login attempts from an IP if > 10 failed attempts in 1 hour
2. **Account-based Rate Limiting**: Locks account if > 5 failed attempts in 1 day

Both are implemented via RPC functions in Supabase that are called in `app/auth/callback/route.ts`.

---

## Test Setup

### Verify Configuration

Before testing, verify the rate limiting config:

```sql
SELECT * FROM rate_limit_config;
```

Expected output:
```
id: 1
max_failed_attempts: 5
lockout_duration_minutes: 30
reset_duration_hours: 24
```

**What each value means:**
- `max_failed_attempts: 5` = Account gets locked after 5 failed attempts in 24 hours
- `lockout_duration_minutes: 30` = Account stays locked for 30 minutes
- `reset_duration_hours: 24` = Failed attempt count resets after 24 hours

---

## Test 1: Account-Based Rate Limiting (Easiest)

**Goal:** Lock an account by making 5 failed login attempts

### Step 1: Create 5 Failed Login Attempts

Run this SQL to simulate 5 failed logins from different IPs (so IP limiting doesn't interfere):

```sql
-- Create 5 failed attempts for the same email address
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('testlock@dlsu.edu.ph', false, '203.0.113.1'::inet, 'test', true, NOW() - INTERVAL '5 min'),
  ('testlock@dlsu.edu.ph', false, '203.0.113.2'::inet, 'test', true, NOW() - INTERVAL '4 min'),
  ('testlock@dlsu.edu.ph', false, '203.0.113.3'::inet, 'test', true, NOW() - INTERVAL '3 min'),
  ('testlock@dlsu.edu.ph', false, '203.0.113.4'::inet, 'test', true, NOW() - INTERVAL '2 min'),
  ('testlock@dlsu.edu.ph', false, '203.0.113.5'::inet, 'test', true, NOW());
```

### Step 2: Check If Account Is Locked

```sql
SELECT * FROM is_account_rate_limited('testlock@dlsu.edu.ph');
```

**Expected result:**
```
is_limited: true
minutes_remaining: 29-30
```

✅ **Pass**: Account is locked after 5 failed attempts

### Step 3: Verify Account Status Changed

```sql
SELECT email, status FROM users WHERE email = 'testlock@dlsu.edu.ph';
```

**Expected result:**
```
email: testlock@dlsu.edu.ph
status: suspended
```

✅ **Pass**: Account marked as suspended

### Step 4: Wait for Unlock (Optional)

Wait 30 minutes or run this to "fast-forward":

```sql
-- Simulate 31 minutes passing
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES ('testlock@dlsu.edu.ph', false, '203.0.113.6'::inet, 'test', true, NOW() - INTERVAL '31 min');

-- Now check if still limited
SELECT * FROM is_account_rate_limited('testlock@dlsu.edu.ph');
```

Should return: `is_limited: false`

✅ **Pass**: Account unlock works after 30 minutes

---

## Test 2: IP-Based Rate Limiting (Medium)

**Goal:** Lock an IP by making 10 failed login attempts from same IP

### Step 1: Get Your Current IP (or Use Test IP)

**Option A: Get your real IP**
```bash
# On Windows Command Prompt
curl https://api.ipify.org
# On PowerShell
(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content
```

**Option B: Use a test IP (recommended)**
```
203.0.113.100  (this is a test IP range)
```

### Step 2: Create 10 Failed Attempts from Same IP

Replace `TEST.IP.HERE` with your IP (e.g., `203.0.113.100`):

```sql
-- Create 10 failed login attempts from the same IP
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('fail1@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '10 min'),
  ('fail2@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '9 min'),
  ('fail3@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '8 min'),
  ('fail4@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '7 min'),
  ('fail5@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '6 min'),
  ('fail6@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '5 min'),
  ('fail7@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '4 min'),
  ('fail8@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '3 min'),
  ('fail9@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW() - INTERVAL '2 min'),
  ('fail10@dlsu.edu.ph', false, 'TEST.IP.HERE'::inet, 'test', true, NOW());
```

### Step 3: Check If IP Is Rate Limited

Replace `TEST.IP.HERE` with your test IP:

```sql
SELECT * FROM is_ip_rate_limited('TEST.IP.HERE'::inet);
```

**Expected result:**
```
is_limited: true
minutes_remaining: 29-30
```

✅ **Pass**: IP is blocked after 10 failed attempts

### Step 4: Verify Failed Attempts Were Logged

```sql
SELECT email, ip_address, success, created_at 
FROM login_attempts 
WHERE ip_address = 'TEST.IP.HERE'::inet
ORDER BY created_at DESC 
LIMIT 5;
```

Should show 10 rows with `success: false`

✅ **Pass**: All failed attempts logged

### Step 5: Test Real Login from Locked IP

⚠️ **WARNING**: This will actually lock you out from that IP!

1. If you're using your real IP, **DON'T** try to login - you'll be locked out for 30 minutes
2. If using a test IP, you can't test the real login flow from that IP

**Safe Alternative:** Check the callback logs instead:

In `app/auth/callback/route.ts`, the code checks IP rate limit:
```typescript
const { data: ipLimitData } = await supabase.rpc('is_ip_rate_limited', { client_ip: clientIP });

if (ipLimitData?.[0]?.is_limited) {
  // Blocks login and shows error
  return NextResponse.redirect(`...?error=rate_limited&minutes=${minutesRemaining}`);
}
```

So if a user tries to login from a blocked IP, they'll see:
```
error=rate_limited&minutes=30
```

---

## Test 3: End-to-End Rate Limiting (Advanced)

**Goal:** Test the complete flow from OAuth callback to rate limiting

### Setup

1. Clear old test data:
```sql
DELETE FROM login_attempts WHERE email LIKE 'e2e%@dlsu.edu.ph';
```

2. Create a test account (if not exists):
```sql
INSERT INTO users (id, email, role, name, id_number)
VALUES (
  gen_random_uuid(),
  'e2e_test@dlsu.edu.ph',
  'user',
  'E2E Test User',
  '12345678'
)
ON CONFLICT (email) DO NOTHING;
```

### Flow Test

1. **Attempt 1-5**: Try logging in with wrong password
   - Expected: Each shows "Invalid password" or similar
   - Check database: 5 rows in `login_attempts` with `success: false`

2. **Attempt 6**: Try logging in again
   - Expected: See error "Your account has been temporarily locked. Try again in 30 minutes."
   - Check database: `users.status = 'suspended'`

3. **Verify in Database**:
```sql
-- Check failed attempts
SELECT COUNT(*) as failed_count, MAX(created_at) 
FROM login_attempts 
WHERE email = 'e2e_test@dlsu.edu.ph' AND success = false;

-- Check account status
SELECT status FROM users WHERE email = 'e2e_test@dlsu.edu.ph';

-- Check if limited
SELECT * FROM is_account_rate_limited('e2e_test@dlsu.edu.ph');
```

✅ **Pass**: All three checks show account is locked

---

## Test 4: Rate Limit Reset (Advanced)

**Goal:** Verify that failed attempt counts reset after 24 hours

### Step 1: Insert Old Failed Attempts

```sql
-- Insert attempts from 25 hours ago (older than 24 hour window)
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('reset_test@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '25 hours'),
  ('reset_test@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '24.5 hours'),
  ('reset_test@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '24.1 hours');

-- Insert 3 recent failed attempts (within 24 hours)
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('reset_test@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '2 hours'),
  ('reset_test@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '1 hour'),
  ('reset_test@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW());
```

### Step 2: Check Rate Limit Status

```sql
SELECT * FROM is_account_rate_limited('reset_test@dlsu.edu.ph');
```

**Expected result:**
```
is_limited: false
minutes_remaining: 0
```

✅ **Pass**: Old attempts don't count, only 3 recent attempts = not limited

### Step 3: Add 2 More Recent Attempts

```sql
INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
VALUES 
  ('reset_test@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW() - INTERVAL '30 min'),
  ('reset_test@dlsu.edu.ph', false, '203.0.113.50'::inet, 'test', true, NOW());

-- Now check again
SELECT * FROM is_account_rate_limited('reset_test@dlsu.edu.ph');
```

**Expected result:**
```
is_limited: true
minutes_remaining: 29-30
```

✅ **Pass**: With 5 recent attempts (within 24 hours), account is locked

---

## Test 5: Verify Rate Limiting in OAuth Callback

**Goal:** Verify the rate limiting functions are actually called during login

### Check the Code

1. Open `app/auth/callback/route.ts`
2. Look for these lines:

```typescript
// IP rate limiting check
const { data: ipLimitData } = await supabase.rpc('is_ip_rate_limited', { client_ip: clientIP });

if (ipLimitData?.[0]?.is_limited) {
  // Blocks login
}

// Account rate limiting check
const { data: accountLimitData } = await supabase.rpc('is_account_rate_limited', { user_email: email });

if (accountLimitData?.[0]?.is_limited) {
  // Blocks login
}
```

✅ **Pass**: Both checks are present in callback

### Check the Logs

1. Open browser DevTools (F12) → Console
2. Try to login with a blocked account
3. Look for logs like:
   ```
   [OAuth Callback] Processing login for: testlock@dlsu.edu.ph
   [OAuth Callback] Checking rate limits...
   ```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `is_account_rate_limited` returns NULL | Check if `login_attempts` table exists and has data |
| Account not suspended | Check if `check_and_suspend_account()` is called in callback |
| Rate limiting not working | Verify `rate_limit_config` has correct values |
| Can still login when locked | Check if RLS policies allow bypassing rate limit |
| Tests interfere with real accounts | Use test emails like `testlock@dlsu.edu.ph`, not real account emails |

---

## Summary Table

| Test | What It Tests | Time | Difficulty |
|------|---------------|------|------------|
| Test 1 | Account lockout after 5 failures | 5 min | ⭐ Easy |
| Test 2 | IP blocking after 10 failures | 10 min | ⭐⭐ Medium |
| Test 3 | Full OAuth callback flow | 15 min | ⭐⭐ Medium |
| Test 4 | 24-hour failure reset | 10 min | ⭐⭐ Medium |
| Test 5 | Code verification | 5 min | ⭐ Easy |

**Total Time**: ~45 minutes to run all tests

---

## Key Functions to Test

All these RPC functions should work:

```sql
-- Test these directly in SQL Editor

-- 1. Check if account is rate limited
SELECT * FROM is_account_rate_limited('email@dlsu.edu.ph');

-- 2. Check if IP is rate limited  
SELECT * FROM is_ip_rate_limited('203.0.113.1'::inet);

-- 3. Suspend an account
SELECT * FROM check_and_suspend_account('email@dlsu.edu.ph', 'user-uuid');

-- 4. Reset failed count
SELECT reset_failed_login_count('user-uuid');
```

Each should return without errors (✅).

---

**Next Steps**: After passing all tests, move on to testing Re-Authentication (Requirement #4)
