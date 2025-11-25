# 🧪 Re-Auth Testing - Quick Reference

## 5-Minute Quick Test

```bash
# 1. Start dev server
npm run dev

# 2. Go to admin users page
http://localhost:3000/admin/users

# 3. Click Edit button on any user

# 4. Change role or status

# 5. Click "Update User"
   → Re-auth dialog appears ✓

# 6. Enter your password

# 7. Click "Verify & Continue"
   → User updates successfully ✓
   → Success message appears ✓
```

---

## Key Test Points

### 1. Dialog Appears ✅
```
When: Click Edit → Change field → Click Update
Then: Re-auth dialog shows password input
```

### 2. Correct Password Works ✅
```
When: Enter correct password → Click Verify
Then: Dialog closes, user updates, success toast
```

### 3. Wrong Password Fails ✅
```
When: Enter wrong password → Click Verify
Then: Error message, dialog stays open, user NOT updated
```

### 4. Session Token Created ✅
```
When: Re-auth succeeds
Then: sessionStorage has 'reauth_...' key
```

### 5. Logs Created ✅
```
When: Any re-auth attempt
Then: admin_reauth_logs table has new entry
```

---

## Browser Testing Commands

### Check Dialog Exists
```javascript
console.log('Dialog visible:', !!document.querySelector('[role="dialog"]'));
```

### Check Token After Auth
```javascript
console.log('Tokens:', Object.keys(sessionStorage).filter(k => k.startsWith('reauth_')));
```

### Decode Token
```javascript
const token = sessionStorage.getItem('reauth_Update User');
console.log('Token data:', JSON.parse(atob(token)));
```

---

## Database Queries

### View All Attempts
```sql
SELECT * FROM admin_reauth_logs 
ORDER BY created_at DESC LIMIT 10;
```

### View Successful Attempts
```sql
SELECT * FROM admin_reauth_logs 
WHERE status = 'verified' 
ORDER BY created_at DESC;
```

### View Failed Attempts
```sql
SELECT * FROM admin_reauth_logs 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

### View Audit Logs
```sql
SELECT * FROM audit_logs 
WHERE action LIKE 'user_%' 
AND reauth_verified = true
ORDER BY timestamp DESC;
```

---

## Expected Results

| Test | Expected |
|------|----------|
| Dialog appears | ✅ Yes |
| Correct password | ✅ Update succeeds |
| Wrong password | ✅ Error shown |
| Cancel button | ✅ Closes dialog |
| Logs in DB | ✅ Entry created |
| Token in storage | ✅ Present (5 min) |
| Token expired | ✅ Invalid after 5 min |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Dialog won't show | Check component is imported in page.tsx |
| Password not accepted | Verify email/password is correct |
| No logs in DB | Check migration ran, check RLS policy |
| Token not appearing | Check sessionStorage in DevTools |
| Permission denied error | Check user has admin role |

---

## Test Completion Checklist

```
□ Migration deployed to Supabase
□ Dialog appears when editing user
□ Correct password accepted
□ Wrong password rejected
□ Logs created in admin_reauth_logs
□ Audit logs show reauth_verified=true
□ Token expires after 5 minutes
□ Security - no password leaks
□ UI/UX - smooth interaction
□ Error messages - clear and helpful
```

✅ All checked? You're done testing!

---

## Full Testing Guide

For detailed testing procedures, see: **TESTING_REAUTHENTICATION.md**

Includes:
- Scenario-based testing
- Security testing
- Performance testing
- Database verification
- SQL queries

---

## Need Help?

- **Quick Start:** REAUTHENTICATION_QUICK_START.md
- **Setup:** REAUTHENTICATION_SETUP.md
- **Full Guide:** docs/REAUTHENTICATION.md
- **Detailed Tests:** TESTING_REAUTHENTICATION.md
