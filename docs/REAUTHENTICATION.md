# Re-Authentication for Critical Admin Operations

## Overview

This feature adds an additional security layer to critical admin operations by requiring users to re-authenticate before performing sensitive actions.

## What Requires Re-Authentication?

### User Management (🔴 High Priority)
- ✅ Updating user roles (user → admin, admin → user)
- ✅ Changing user status (active → suspended)
- ✅ Deactivating/deleting user accounts

### Future Implementations
- Building/Classroom management
- System settings changes
- Audit log access (for sensitive data)
- API key generation

## How It Works

### 1. User Initiates Critical Action
```
Admin clicks "Update User" → 
  Application triggers re-auth dialog
```

### 2. Re-Authentication Dialog
```
Security verification dialog appears with:
- Alert explaining the action
- Optional password verification
- IP address logging
- Audit trail recording
```

### 3. Verification Process
```
User enters password → 
  Application verifies with Supabase auth →
  Session token created (5-minute expiration) →
  Action logged to audit_logs and admin_reauth_logs
```

### 4. Action Execution
```
User action is executed →
  Audit log created with reauth_verified = true →
  Success/error notification
```

## Components

### ReAuthDialog Component
Located: `components/ReAuthDialog.tsx`

Props:
```typescript
interface ReAuthDialogProps {
  open: boolean                      // Dialog visibility
  onOpenChange: (open: boolean) => void  // State setter
  onSuccess: () => void              // Callback after verification
  actionName: string                 // Display name of action
  requiresPassword?: boolean         // Require password verification
}
```

### Hook: useReAuthVerification
```typescript
const { isValidSession, clearSession } = useReAuthVerification('action_name');

// Check if user has valid re-auth session
if (isValidSession()) {
  // Proceed with action
}

// Clear the session when done
clearSession();
```

## Database Schema

### admin_reauth_logs Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (References users)
- action_name: VARCHAR(255)
- action_details: JSONB
- status: VARCHAR(20) (pending, verified, failed, cancelled)
- ip_address: INET
- user_agent: TEXT
- verified_at: TIMESTAMP
- failed_at: TIMESTAMP
- created_at: TIMESTAMP
```

### Indexes
- `idx_admin_reauth_user_id` - For user activity queries
- `idx_admin_reauth_action` - For action-specific logs
- `idx_admin_reauth_status` - For status filtering

## Usage in Components

### Basic Implementation
```typescript
'use client'

import { ReAuthDialog } from '@/components/ReAuthDialog'
import { useState } from 'react'

export default function AdminPanel() {
  const [showReAuth, setShowReAuth] = useState(false)

  const handleCriticalAction = () => {
    setShowReAuth(true)
  }

  const onReAuthSuccess = async () => {
    // Execute the critical action here
    console.log('Action verified!')
  }

  return (
    <>
      <button onClick={handleCriticalAction}>
        Delete User
      </button>

      <ReAuthDialog
        open={showReAuth}
        onOpenChange={setShowReAuth}
        onSuccess={onReAuthSuccess}
        actionName="Delete User"
        requiresPassword={true}
      />
    </>
  )
}
```

### Advanced: With Session Token
```typescript
import { useReAuthVerification } from '@/components/ReAuthDialog'

function CriticalAction() {
  const { isValidSession, clearSession } = useReAuthVerification('update_user_role')

  const executeAction = () => {
    if (!isValidSession()) {
      // Show re-auth dialog
      return
    }

    // Token is valid (within 5 minutes)
    // Proceed with action
    performUpdate()
    clearSession()
  }
}
```

## Security Features

### 1. Session Token Expiration
- Tokens expire after 5 minutes
- Stored in `sessionStorage` (cleared when tab closes)
- Not persisted to localStorage

### 2. Audit Logging
All re-auth attempts logged with:
- User ID
- Action name
- IP address
- User agent
- Timestamp
- Verification status

### 3. Rate Limiting (Future)
Can be added to prevent brute-force attempts:
```sql
-- Limit re-auth attempts to 5 per 10 minutes
SELECT COUNT(*) FROM admin_reauth_logs
WHERE user_id = ? AND created_at > NOW() - INTERVAL '10 minutes'
```

### 4. RLS Policies
- Only admins can view re-auth logs
- Users cannot view other users' re-auth history

## Admin Panel for Monitoring

### View Re-auth Logs Query
```sql
SELECT 
  u.email,
  arl.action_name,
  arl.status,
  arl.verified_at,
  arl.ip_address,
  arl.created_at
FROM admin_reauth_logs arl
JOIN users u ON arl.user_id = u.id
ORDER BY arl.created_at DESC
LIMIT 100;
```

### Suspicious Activity Detection
```sql
-- Users with failed re-auth attempts
SELECT 
  user_id,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM admin_reauth_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY user_id
HAVING COUNT(*) > 3;
```

## Deployment Checklist

- [ ] Run migration: `014_reauthentication.sql`
- [ ] Import `ReAuthDialog` in admin pages
- [ ] Wrap critical actions with re-auth
- [ ] Test re-auth flow
- [ ] Monitor audit logs for any issues
- [ ] Document in admin guide

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**
   - Add TOTP verification
   - Support for SMS/email codes

2. **Device Fingerprinting**
   - Track device changes
   - Alert on new device logins

3. **Geo-Blocking**
   - Detect unusual locations
   - Require re-auth for unusual IP ranges

4. **Adaptive Risk Scoring**
   - Score risk based on time, location, behavior
   - Adjust re-auth requirements dynamically

5. **Admin Approval Workflow**
   - Certain actions require approval from multiple admins
   - Email notifications for critical changes

## Testing

### Test Scenarios

1. **Valid Re-auth**
   ```
   1. Click critical action button
   2. Dialog appears
   3. Enter correct password
   4. Action completes
   5. Audit log created with verified_at timestamp
   ```

2. **Failed Re-auth**
   ```
   1. Click critical action button
   2. Dialog appears
   3. Enter incorrect password
   4. Error message displayed
   5. Audit log created with failed_at timestamp
   6. Action not executed
   ```

3. **Session Expiration**
   ```
   1. Complete re-auth (get token)
   2. Wait 6 minutes
   3. Attempt to use token
   4. Token should be invalid
   5. Re-auth required again
   ```

## Support & Troubleshooting

### Common Issues

**"Session expired" error**
- Token expires after 5 minutes
- Users need to re-authenticate
- Clear browser cache if token persists

**"Password verification failed"**
- Ensure password is correct
- Check Supabase auth settings
- Verify email is correct

**Audit logs not appearing**
- Check RLS policies
- Ensure user is admin
- Verify audit_logs table exists

## References

- [Supabase Authentication Docs](https://supabase.com/docs/guides/auth)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Audit Logging Best Practices](https://www.ncsc.gov.uk/collection/mobile-device-guidance)
