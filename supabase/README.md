# Database Setup

## Running the Migration

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/kdxdgfkvhyireomrrbip
2. Navigate to the SQL Editor
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste and run the SQL in the editor

## Configuring Google OAuth

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials
4. In the "Site URL" field, add: `http://localhost:3000`
5. In "Redirect URLs", add: `http://localhost:3000/auth/callback`

## Email Domain Restriction

The app enforces @dlsu.edu.ph email addresses. This is handled in the auth callback.

## Initial Admin Setup

After first login, you'll need to manually update your user role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@dlsu.edu.ph';
```

Run this in the Supabase SQL Editor to grant yourself admin access.

