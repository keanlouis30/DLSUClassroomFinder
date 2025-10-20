# DLSU Classroom Finder - Setup & Completion Guide

## 🚀 Quick Start

### 1. Database Setup (CRITICAL - DO THIS FIRST)

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/kdxdgfkvhyireomrrbip
2. **Go to SQL Editor** (left sidebar)
3. **Copy and run** the SQL from: `supabase/migrations/001_initial_schema.sql`
4. **Verify tables created**: Check Database > Tables in the sidebar

### 2. Configure Google OAuth

1. In Supabase Dashboard: **Authentication > Providers**
2. **Enable Google** provider
3. Get Google OAuth credentials from: https://console.cloud.google.com/
   - Create OAuth 2.0 Client ID
   - Authorized redirect URIs: `https://kdxdgfkvhyireomrrbip.supabase.co/auth/v1/callback`
4. Add credentials to Supabase
5. In Supabase Auth settings:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 3. Install & Run

```bash
# Install dependencies (already done)
npm install

# Run development server
npm run dev
```

Visit: http://localhost:3000

### 4. Create First Admin User

1. Sign in with your @dlsu.edu.ph Google account
2. Go to Supabase SQL Editor
3. Run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@dlsu.edu.ph';
```

## 📁 Project Status

### ✅ COMPLETED

1. **Project Setup**
   - Next.js 14 with TypeScript
   - Tailwind CSS configured
   - All dependencies installed
   - Environment variables set

2. **Database**
   - Complete schema with all tables
   - Row-Level Security policies
   - Helper functions
   - Triggers and indexes

3. **Authentication**
   - Google OAuth setup
   - @dlsu.edu.ph domain restriction
   - Auth callback handler
   - Logout functionality

4. **Core Files**
   - Supabase client (browser & server)
   - Utils and configuration
   - Landing page
   - Login page

### ⚠️ TO BE IMPLEMENTED

Due to time/space constraints, the following need to be built:

#### 1. Protected Route Middleware
Create `middleware.ts` in root:
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.response();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/manager/:path*'],
};
```

#### 2. Dashboard Pages

**Dashboard Layout** (`app/(dashboard)/layout.tsx`):
- Navigation sidebar with role-based menu
- User dropdown with logout
- Breadcrumbs

**User Dashboard** (`app/(dashboard)/dashboard/page.tsx`):
- Welcome message
- Quick stats (upcoming bookings, available rooms)
- Recent activity

**Additional Pages Needed**:
- `/dashboard/heatmap` - Interactive heat map
- `/dashboard/calendar` - Calendar view
- `/dashboard/search` - Room search
- `/dashboard/my-bookings` - Booking management
- `/dashboard/profile` - User profile

#### 3. Manager Pages

- `/manager` - Manager dashboard
- `/manager/schedules` - Schedule CRUD
- `/manager/rooms` - Room management
- `/manager/reports` - Reports queue

#### 4. Admin Pages

- `/admin` - Admin dashboard
- `/admin/users` - User management with role assignment
- `/admin/buildings` - Building/classroom CRUD
- `/admin/logs` - Audit log viewer
- `/admin/analytics` - Usage statistics

#### 5. API Routes

**Bookings** (`app/api/bookings/route.ts`):
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const BookingSchema = z.object({
  classroom_id: z.string().uuid(),
  booking_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = BookingSchema.parse(body);

  // TODO: Add conflict detection logic
  // TODO: Check user booking limits
  // TODO: Insert booking
  // TODO: Create audit log

  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, classrooms(*), buildings(*)')
    .eq('user_id', user.id)
    .order('booking_date', { ascending: false });

  return NextResponse.json(bookings);
}
```

**Other API Routes Needed**:
- `/api/classrooms` - CRUD for classrooms
- `/api/buildings` - CRUD for buildings
- `/api/schedules` - CRUD for class schedules
- `/api/reports` - CRUD for reports
- `/api/users` - User management (admin only)
- `/api/audit-logs` - Audit log retrieval

#### 6. Shared Components

Create in `components/` directory:

**UI Components** (shadcn/ui):
```bash
# Install shadcn components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
```

**Custom Components**:
- `components/Sidebar.tsx` - Navigation sidebar
- `components/Header.tsx` - Page header with user menu
- `components/ClassroomCard.tsx` - Classroom display card
- `components/BookingCard.tsx` - Booking display card
- `components/HeatMap.tsx` - Interactive heat map component
- `components/CalendarView.tsx` - Calendar component
- `components/DataTable.tsx` - Reusable data table

#### 7. Real-Time Features

**Setup Supabase Realtime** (`lib/supabase/realtime.ts`):
```typescript
import { createClient } from './client';

export function subscribeToClassrooms(callback: (payload: any) => void) {
  const supabase = createClient();

  const channel = supabase
    .channel('classroom-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'classrooms' },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToBookings(userId: string, callback: (payload: any) => void) {
  const supabase = createClient();

  const channel = supabase
    .channel('booking-changes')
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

#### 8. Booking Logic

**Conflict Detection** (`lib/booking-utils.ts`):
```typescript
import { createClient } from './supabase/server';

export async function checkBookingConflicts(
  classroomId: string,
  date: string,
  startTime: string,
  endTime: string
) {
  const supabase = await createClient();

  // Check one-time bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('booking_date', date)
    .neq('status', 'cancelled')
    .neq('status', 'auto_cancelled');

  // Check recurring schedules
  const dayOfWeek = new Date(date).getDay();
  const { data: schedules } = await supabase
    .from('class_schedules')
    .select('*')
    .eq('classroom_id', classroomId)
    .contains('days_of_week', [dayOfWeek])
    .lte('start_date', date)
    .gte('end_date', date);

  // TODO: Implement time overlap logic
  // Return true if conflict exists

  return { hasConflict: false, conflicts: [] };
}

export async function checkUserBookingLimits(userId: string, date: string) {
  const supabase = await createClient();

  const { data: bookings, count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('booking_date', date)
    .in('status', ['pending', 'confirmed', 'checked_in']);

  return { count: count || 0, exceededLimit: (count || 0) >= 2 };
}
```

#### 9. Audit Logging

**Audit Helper** (`lib/audit.ts`):
```typescript
import { createClient } from './supabase/server';

export async function createAuditLog({
  userId,
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
}: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
}) {
  const supabase = await createClient();

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address: ipAddress,
  });
}
```

## 🎨 UI/UX Guidelines

- Use DLSU green (#006747) as primary color (already configured in globals.css)
- Follow consistent card-based layout
- Use lucide-react icons throughout
- Implement loading states for all async operations
- Add error boundaries for graceful error handling
- Mobile-responsive design (Tailwind breakpoints)

## 🔒 Security Checklist

- [x] RLS policies enabled on all tables
- [x] Email domain restriction (@dlsu.edu.ph)
- [ ] CSRF protection on forms
- [ ] Rate limiting on API routes
- [ ] Input validation with Zod schemas
- [ ] XSS protection (React handles most)
- [ ] Audit logging for sensitive actions
- [ ] Role checks on all protected routes

## 📊 Testing

1. **Manual Testing**:
   - Test login/logout flow
   - Test with different roles (user, manager, admin)
   - Test booking creation and conflicts
   - Test real-time updates

2. **Role-Based Testing**:
   - User: Can only see/manage own bookings
   - Manager: Can manage assigned buildings
   - Admin: Can access all features

## 🐛 Troubleshooting

**Issue**: Can't log in
- Check Google OAuth is enabled in Supabase
- Verify redirect URLs are correct
- Check browser console for errors

**Issue**: Database errors
- Ensure migration SQL has been run
- Check RLS policies are enabled
- Verify user has correct role

**Issue**: Real-time not working
- Check Supabase Realtime is enabled
- Verify subscription code
- Check browser console for WebSocket errors

## 📝 Next Steps

1. Run the database migration
2. Configure Google OAuth
3. Test login flow
4. Create first admin user
5. Build out the remaining pages following the patterns shown
6. Implement the API routes
7. Add components as needed
8. Test thoroughly

## 🆘 Need Help?

Refer to:
- `WARP.md` - Development guidelines
- `supabase/README.md` - Database setup
- Next.js docs: https://nextjs.org/docs
- Supabase docs: https://supabase.com/docs
- shadcn/ui docs: https://ui.shadcn.com

## 📦 What's Included

```
DLSUClassroomFinder/
├── app/
│   ├── (dashboard)/          # TO BE CREATED
│   ├── auth/
│   │   ├── callback/         # ✅ OAuth callback
│   │   ├── login/            # ✅ Login page
│   │   └── logout/           # ✅ Logout route
│   ├── api/                  # TO BE CREATED
│   ├── globals.css           # ✅ Tailwind styles
│   ├── layout.tsx            # ✅ Root layout
│   └── page.tsx              # ✅ Landing page
├── components/               # TO BE CREATED
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # ✅ Browser client
│   │   └── server.ts         # ✅ Server client
│   └── utils.ts              # ✅ Utility functions
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # ✅ Database schema
│   └── README.md             # ✅ Setup instructions
├── .env.local                # ✅ Environment variables
├── package.json              # ✅ Dependencies
├── tailwind.config.ts        # ✅ Tailwind config
├── tsconfig.json             # ✅ TypeScript config
├── WARP.md                   # ✅ Development guide
└── SETUP_GUIDE.md           # ✅ This file
```

Good luck building your MVP! 🚀

