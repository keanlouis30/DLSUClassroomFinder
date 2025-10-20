# 🚀 DLSU Classroom Finder - Quick Start Guide

## ⏱️ 5-Minute Setup

### Step 1: Run Database Migration (2 minutes)

1. Open: https://supabase.com/dashboard/project/kdxdgfkvhyireomrrbip
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy ALL contents from: `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** (bottom right)
7. ✅ Verify success message appears

### Step 2: Configure Google OAuth (2 minutes)

1. In Supabase Dashboard: **Authentication > Providers**
2. Find **Google** and click **Enable**
3. You'll need Google OAuth credentials:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID (if you don't have one)
   - Authorized redirect URI: `https://kdxdgfkvhyireomrrbip.supabase.co/auth/v1/callback`
4. Paste **Client ID** and **Client Secret** into Supabase
5. In Supabase, add to **Site URL**: `http://localhost:3000`
6. Add to **Redirect URLs**: `http://localhost:3000/auth/callback`
7. Click **Save**

### Step 3: Start the App (1 minute)

```bash
npm run dev
```

Visit: **http://localhost:3000**

### Step 4: Sign In & Make Admin

1. Click **Sign In** button
2. Sign in with your @dlsu.edu.ph Google account
3. After login, go back to Supabase SQL Editor
4. Run this SQL (replace with your email):

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@dlsu.edu.ph';
```

5. Refresh the dashboard page
6. ✅ You should now see admin access!

## 🎯 What You Can Do Now

### As a User:
- ✅ View dashboard
- ✅ View my bookings (empty for now)
- ✅ Logout

### As an Admin:
- ✅ All user capabilities
- ✅ Access admin panel at `/admin`
- ✅ View system statistics
- 📝 Add buildings/classrooms (coming soon)

## 📊 Add Test Data

To test bookings, you need to add buildings and classrooms first:

### Add a Building (Supabase Dashboard > Table Editor)

```sql
INSERT INTO buildings (name, code, floors)
VALUES ('Gokongwei Hall', 'GK', 6);
```

### Add a Classroom

```sql
INSERT INTO classrooms (building_id, room_number, floor, capacity, amenities)
VALUES (
  (SELECT id FROM buildings WHERE code = 'GK'),
  '302-A',
  3,
  40,
  '{"projector": true, "air_conditioning": true, "whiteboard": true}'::jsonb
);
```

## 🔧 Troubleshooting

**Can't log in?**
- Check Google OAuth is enabled in Supabase
- Verify redirect URLs are correct
- Use @dlsu.edu.ph email only

**Database errors?**
- Ensure migration SQL was run successfully
- Check Supabase logs

**Not seeing admin panel?**
- Run the UPDATE users SQL to grant admin role
- Refresh the page after updating role

## 📖 Next Steps

1. Read `PROJECT_STATUS.md` for what's been built
2. Read `SETUP_GUIDE.md` for implementing remaining features
3. Read `WARP.md` for development guidelines

## 🎉 You're Ready!

The foundation is complete. Now you can:
- Add more buildings/classrooms via Supabase
- Test the booking system
- Build out the remaining features
- Deploy to Vercel

**Need help?** Check the documentation files or Supabase/Next.js docs.

Happy coding! 🚀
