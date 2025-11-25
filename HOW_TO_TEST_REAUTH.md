# 🎯 ANSWER: How to Test the Re-Auth Function

## Your Question: "How can I test the reauth function?"

Here's the direct answer:

---

## ⏱️ 5-Minute Quick Test

```bash
# 1. Make sure you have deployed the migration
   - Go to Supabase SQL Editor
   - Run: SELECT * FROM admin_reauth_logs LIMIT 1;
   - If no error → migration is deployed ✓

# 2. Start the dev server
npm run dev

# 3. Go to the admin users page
http://localhost:3000/admin/users

# 4. Click the "Edit" button on any user
   → Edit modal opens

# 5. Change the "Role" or "Status" dropdown
   → Change role to something else

# 6. Click "Update User" button
   → ✅ Re-auth dialog should appear!

# 7. Enter your password
   → Type your @dlsu.edu.ph password

# 8. Click "Verify & Continue" button
   → ✅ User should update successfully!

# 9. Check the logs in Supabase
Supabase → Table: admin_reauth_logs
   → ✅ You should see a new entry with status='verified'
```

---

## 🔍 Verify It's Working

### In Your Browser (DevTools)

```javascript
// Press F12 to open Developer Tools
// Go to Console tab
// Type these commands:

// 1. Check re-auth token was created
console.log(Object.keys(sessionStorage).filter(k => k.startsWith('reauth_')));
// Should return something like: ['reauth_Update User: John Doe']

// 2. Decode the token
const token = sessionStorage.getItem(Object.keys(sessionStorage).find(k => k.startsWith('reauth_')));
console.log(JSON.parse(atob(token)));
// Should show: { userId, timestamp, action, expiresAt }

// 3. Check if it's expired
const tokenData = JSON.parse(atob(token));
console.log('Expired?', Date.now() > tokenData.expiresAt);
// Should be false (token is still valid for 5 minutes)
```

### In Supabase Database

```sql
-- Run this query in Supabase SQL Editor

-- See all re-auth attempts
SELECT * FROM admin_reauth_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Expected result: Shows your recent re-auth attempts
-- status = 'verified' for successful
-- status = 'failed' for wrong password
```

---

## ✅ Test Scenarios

### Test 1: Correct Password (Happy Path)
```
Step 1: Click Edit → Change Role → Click Update
Step 2: Dialog appears, enter CORRECT password
Step 3: Click "Verify & Continue"

Expected Result:
  ✅ Dialog closes
  ✅ Success message appears
  ✅ User role updated
  ✅ Database log shows status='verified'
```

### Test 2: Wrong Password (Error Case)
```
Step 1: Click Edit → Change Status → Click Update
Step 2: Dialog appears, enter WRONG password
Step 3: Click "Verify & Continue"

Expected Result:
  ✅ Error message: "Password verification failed"
  ✅ Dialog stays open
  ✅ User NOT updated
  ✅ Database log shows status='failed'
```

### Test 3: Cancel Action (User Changed Mind)
```
Step 1: Click Edit → Change something → Click Update
Step 2: Dialog appears
Step 3: Click "Cancel" button

Expected Result:
  ✅ Dialog closes
  ✅ Edit modal closes
  ✅ User NOT updated
  ✅ NO database log created
```

### Test 4: Token Expiration (Automatic)
```
Step 1: Complete re-auth successfully
Step 2: Check token in sessionStorage (should work)
Step 3: Wait 6 minutes
Step 4: Check token in sessionStorage again

Expected Result:
  ✅ Token was created after re-auth
  ✅ Token was valid for 5 minutes
  ✅ Token is now expired (invalid)
  ✅ Would need re-auth again
```

---

## 📊 Database Verification Queries

### See All Re-Auth Logs
```sql
SELECT 
  u.email,
  arl.action_name,
  arl.status,
  arl.verified_at,
  arl.created_at
FROM admin_reauth_logs arl
LEFT JOIN users u ON arl.user_id = u.id
ORDER BY arl.created_at DESC
LIMIT 20;
```

### See Only Successful Attempts
```sql
SELECT 
  u.email,
  arl.action_name,
  arl.verified_at
FROM admin_reauth_logs arl
LEFT JOIN users u ON arl.user_id = u.id
WHERE arl.status = 'verified'
ORDER BY arl.created_at DESC;
```

### See Failed Attempts (Wrong Password)
```sql
SELECT 
  u.email,
  arl.action_name,
  arl.created_at,
  COUNT(*) as failures
FROM admin_reauth_logs arl
LEFT JOIN users u ON arl.user_id = u.id
WHERE arl.status = 'failed'
GROUP BY u.email, arl.action_name, arl.created_at
ORDER BY arl.created_at DESC;
```

---

## 🎯 What You Should See

### In the UI
- ✅ Re-auth dialog appears
- ✅ Password input field
- ✅ "Verify & Continue" button
- ✅ "Cancel" button
- ✅ Security warning message

### In the Console (DevTools)
- ✅ No errors
- ✅ Session token in sessionStorage
- ✅ Token data shows expiresAt

### In the Database
- ✅ admin_reauth_logs has new entries
- ✅ status = 'verified' or 'failed'
- ✅ verified_at populated (if successful)
- ✅ ip_address captured
- ✅ user_agent captured

### In Audit Logs
- ✅ action = 'user_updated'
- ✅ reauth_verified = true (if successful)
- ✅ Timestamp accurate

---

## 🆘 If Something Doesn't Work

### Problem: Dialog doesn't appear
**Solution:**
```
1. Check migration was deployed
   SELECT * FROM admin_reauth_logs LIMIT 1;
   (Should not error)

2. Check user is admin
   SELECT role FROM users WHERE id = YOUR_USER_ID;
   (Should be 'admin')

3. Check component is imported
   Look in: app/admin/users/page.tsx line 16
   Should have: import { ReAuthDialog } from '@/components/ReAuthDialog'
```

### Problem: Password not accepted
**Solution:**
```
1. Verify email/password combo
   Try logging out and back in with same credentials

2. Check password is exactly right
   Passwords are case-sensitive

3. Check user exists in auth.users
   SELECT * FROM auth.users WHERE email = 'your@email.com';
```

### Problem: No logs in database
**Solution:**
```
1. Check migration ran
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'admin_reauth_logs';
   (Should return 1 row)

2. Check RLS policy
   SELECT * FROM pg_policies 
   WHERE tablename = 'admin_reauth_logs';
   (Should return 1 policy)

3. Check user is admin (RLS requires admin)
   SELECT role FROM users WHERE id = YOUR_USER_ID;
   (Should be 'admin')
```

---

## 📚 More Detailed Testing

For comprehensive testing procedures, see:
- **TESTING_QUICK_REFERENCE.md** - Quick reference
- **TESTING_REAUTHENTICATION.md** - Detailed guide
- **REAUTHENTICATION_CHECKLIST.md** - Full checklist

---

## ✅ Success Checklist

After testing, check off:

```
□ Dialog appears when expected
□ Correct password works
□ Wrong password rejected
□ Cancel button closes dialog
□ User updates in database
□ Logs created in admin_reauth_logs
□ Audit logs show reauth_verified=true
□ Token appears in sessionStorage
□ Token expires after 5 minutes
□ No password leaks in logs/console
```

**All checked? You're done testing! ✅**

---

## 🚀 Summary

**How to test the re-auth function:**

1. ⏱️ **Quick Test** (5 min): Follow the "5-Minute Quick Test" above
2. 🔍 **Verify** (2 min): Run the database queries
3. ✅ **Scenarios** (15 min): Test the 4 scenarios
4. 📚 **Detailed** (30 min): Read TESTING_REAUTHENTICATION.md

**Total: 40 minutes for complete testing**

---

**Start with:** The 5-Minute Quick Test above! 🚀
