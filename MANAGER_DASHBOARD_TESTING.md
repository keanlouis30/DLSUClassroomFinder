# Manager Dashboard Testing Guide

**For Manager Dashboard Functionality (Requirement #2)**

---

## Overview

The manager dashboard has 4 main pages:

1. **Main Dashboard** (`/manager`) - Overview with statistics and quick actions
2. **Schedules** (`/manager/schedules`) - CRUD for class schedules
3. **Rooms** (`/manager/rooms`) - View and edit classroom details
4. **Bookings** (`/manager/bookings`) - Approve/reject room bookings

All pages are **role-protected** (manager or admin only) and **data-scoped** to the manager's assigned buildings.

---

## Pre-Test Setup

### Create a Test Manager Account

**Option A: Via SQL (Fastest)**

```sql
-- Create manager user
INSERT INTO users (id, email, role, name, id_number, department)
VALUES (
  gen_random_uuid(),
  'manager@dlsu.edu.ph',
  'manager',
  'Test Manager',
  '12345678',
  'IT'
)
ON CONFLICT (email) DO NOTHING;

-- Get the manager's ID and a building ID
SELECT u.id as manager_id, b.id as building_id
FROM users u, buildings b
WHERE u.email = 'manager@dlsu.edu.ph'
LIMIT 1;

-- Assign building to manager (replace IDs from above)
INSERT INTO user_buildings (user_id, building_id)
VALUES ('MANAGER_ID_HERE', 'BUILDING_ID_HERE');
```

**Option B: Via Web UI (More Complete)**

1. Login as admin
2. Go to `/admin/users`
3. Click "Create User"
4. Fill in:
   - Email: `manager@dlsu.edu.ph`
   - Role: `manager`
   - Name: `Test Manager`
   - ID Number: `12345678`
5. Click "Create User"
6. Assign buildings via SQL (see above)

### Verify Setup

```sql
-- Verify manager exists and has building assigned
SELECT u.email, u.role, b.name as building_name
FROM users u
LEFT JOIN user_buildings ub ON u.id = ub.user_id
LEFT JOIN buildings b ON ub.building_id = b.id
WHERE u.email = 'manager@dlsu.edu.ph';
```

Expected output:
```
email: manager@dlsu.edu.ph
role: manager
building_name: (should show a building name)
```

✅ **Pass**: Manager created and assigned to building

---

## Test 1: Access Control (5 minutes)

**Goal:** Verify only managers/admins can access manager pages

### Test 1.1: Regular User Cannot Access Manager Routes

1. Login as regular user (non-admin, non-manager)
2. Try to access `http://localhost:3000/manager`
3. Should be redirected to `/dashboard`

**SQL to create test user:**
```sql
INSERT INTO users (id, email, role, name, id_number)
VALUES (gen_random_uuid(), 'user@dlsu.edu.ph', 'user', 'Test User', '87654321')
ON CONFLICT (email) DO NOTHING;
```

✅ **Pass**: Regular user redirected

### Test 1.2: Manager Can Access Manager Routes

1. Login as manager: `manager@dlsu.edu.ph`
2. Go to `http://localhost:3000/manager`
3. Should see the Manager Dashboard

✅ **Pass**: Manager dashboard loads

### Test 1.3: Admin Can Access Manager Routes

1. Login as admin
2. Go to `http://localhost:3000/manager`
3. Should see the Manager Dashboard (with all data from all buildings)

✅ **Pass**: Admin can access manager pages

---

## Test 2: Main Dashboard Page (10 minutes)

**Goal:** Verify dashboard displays correct statistics and navigation

### Test 2.1: Dashboard Loads Successfully

1. Login as manager: `manager@dlsu.edu.ph`
2. Navigate to `/manager`
3. Page should load without errors

**Check browser console:**
- No red errors in F12 → Console
- Should see logs showing data fetching

✅ **Pass**: Dashboard loads without errors

### Test 2.2: Verify All Dashboard Elements

Check that the page displays:

- [ ] Welcome message with manager's name
- [ ] Statistics cards showing:
  - Assigned Buildings count
  - Total Classrooms in assigned buildings
  - Pending Bookings count
  - Schedule Conflicts count
- [ ] Quick Action cards with links to:
  - Manage Schedules
  - Manage Rooms
  - Booking Requests
- [ ] List of assigned buildings

**SQL to verify data exists:**
```sql
-- Count assigned buildings
SELECT COUNT(*) as building_count
FROM user_buildings
WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph');

-- Count classrooms in those buildings
SELECT COUNT(*) as classroom_count
FROM classrooms
WHERE building_id IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
);

-- Count pending bookings
SELECT COUNT(*) as pending_bookings
FROM bookings b
JOIN classrooms c ON b.classroom_id = c.id
WHERE c.building_id IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
) AND b.status = 'pending';
```

✅ **Pass**: All statistics display correctly

### Test 2.3: Data Isolation (Important!)

**Goal:** Verify manager only sees their assigned buildings

1. Login as manager
2. Check the statistics
3. Now add another building to a different user:

```sql
-- Get a building NOT assigned to manager
SELECT b.id, b.name
FROM buildings b
WHERE b.id NOT IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
)
LIMIT 1;
```

4. Refresh the manager dashboard
5. Statistics should NOT include data from that building

✅ **Pass**: Manager only sees their assigned buildings

---

## Test 3: Schedules Management (15 minutes)

**Goal:** Test CRUD operations on class schedules

### Test 3.1: View Schedules List

1. From dashboard, click "Manage Schedules" or go to `/manager/schedules`
2. Page should display a list of class schedules in manager's buildings

```sql
-- Verify schedules exist in manager's buildings
SELECT cs.id, cs.subject_code, cs.day_of_week, cs.start_time, c.room_number
FROM class_schedules cs
JOIN classrooms c ON cs.classroom_id = c.id
WHERE c.building_id IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
)
LIMIT 5;
```

✅ **Pass**: Schedules display correctly

### Test 3.2: Create New Schedule

1. Click "Add Schedule" button
2. Fill in form:
   - Classroom: (select one from dropdown)
   - Day: Monday
   - Start Time: 08:00
   - End Time: 09:30
   - Subject Code: TEST101
   - Instructor: Test Instructor
3. Click "Create Schedule"
4. Should see success message
5. New schedule should appear in list

**Verify in SQL:**
```sql
SELECT * FROM class_schedules 
WHERE subject_code = 'TEST101'
ORDER BY created_at DESC LIMIT 1;
```

✅ **Pass**: Schedule created successfully

### Test 3.3: Update Schedule (if implemented)

1. Click "Edit" on a schedule
2. Change the subject code (e.g., `TEST101` → `TEST102`)
3. Click "Update"
4. Schedule list should update

```sql
SELECT subject_code FROM class_schedules 
WHERE subject_code = 'TEST102'
LIMIT 1;
```

✅ **Pass**: Schedule updated

### Test 3.4: Delete Schedule

1. Click "Delete" on a schedule
2. Confirm deletion
3. Schedule should disappear from list

```sql
-- Verify schedule was deleted
SELECT COUNT(*) FROM class_schedules 
WHERE subject_code = 'TEST101';
-- Should return 0
```

✅ **Pass**: Schedule deleted

### Test 3.5: Data Isolation

1. Create a schedule in manager's building
2. Create a schedule in ANOTHER building (via SQL):

```sql
-- Insert schedule in building manager doesn't manage
SELECT b.id FROM buildings b
WHERE b.id NOT IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
)
LIMIT 1;

-- Get a classroom in that building
SELECT c.id FROM classrooms c
WHERE c.building_id = 'BUILDING_ID_ABOVE';

-- Insert schedule there
INSERT INTO class_schedules (classroom_id, day_of_week, start_time, end_time, subject_code, instructor_name)
VALUES ('CLASSROOM_ID', 'Tuesday', '10:00', '11:30', 'HIDDEN101', 'Hidden Instructor');
```

3. Refresh manager's schedules page
4. The hidden schedule should NOT appear in manager's list

✅ **Pass**: Manager only sees their buildings' schedules

---

## Test 4: Rooms Management (15 minutes)

**Goal:** Test viewing and editing classrooms

### Test 4.1: View Rooms List

1. From dashboard, click "Manage Rooms" or go to `/manager/rooms`
2. Page should display grid/list of classrooms in manager's buildings

```sql
-- Verify classrooms exist
SELECT c.id, c.room_number, c.capacity, c.building_id
FROM classrooms c
WHERE c.building_id IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
)
LIMIT 5;
```

✅ **Pass**: Rooms display correctly

### Test 4.2: Edit Room Details

1. Click "Edit" on any room
2. Modal should open showing:
   - Room number
   - Building
   - Capacity
   - Amenities
   - Status (available/occupied/maintenance)
3. Change capacity (e.g., 30 → 40)
4. Add amenities (e.g., "Smart Board, AC")
5. Change status to "Maintenance"
6. Click "Update Room"

**Verify in SQL:**
```sql
SELECT capacity, amenities, status FROM classrooms 
WHERE room_number = 'ROOM_NUMBER'
ORDER BY updated_at DESC LIMIT 1;
```

Expected:
```
capacity: 40
amenities: Smart Board, AC
status: maintenance
```

✅ **Pass**: Room updated successfully

### Test 4.3: Data Isolation

1. Edit a room in manager's building
2. Try to directly modify a room in another building via SQL:

```sql
UPDATE classrooms SET amenities = 'HACKED' 
WHERE building_id NOT IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
)
LIMIT 1;
```

3. Refresh manager's rooms page
4. The hacked room should NOT appear or should not show the "HACKED" amenities

✅ **Pass**: Manager cannot see/edit other buildings' rooms

---

## Test 5: Bookings Management (20 minutes)

**Goal:** Test viewing and approving/rejecting bookings

### Test 5.1: Create Test Bookings

First, create some test bookings in the manager's buildings:

```sql
-- Get a classroom in manager's building
SELECT c.id, c.room_number 
FROM classrooms c
WHERE c.building_id IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
)
LIMIT 1;

-- Get a regular user ID
SELECT id FROM users WHERE role = 'user' LIMIT 1;

-- Create pending booking
INSERT INTO bookings (user_id, classroom_id, booking_date, start_time, end_time, purpose, status)
VALUES (
  'USER_ID_HERE',
  'CLASSROOM_ID_HERE',
  CURRENT_DATE + INTERVAL '1 day',
  '14:00',
  '15:30',
  'Study Group',
  'pending'
);

-- Repeat this 3-4 times with different times to create multiple bookings
```

### Test 5.2: View Pending Bookings

1. From dashboard, click "Booking Requests" or go to `/manager/bookings`
2. Page should show all pending bookings in manager's buildings

```sql
-- Verify pending bookings exist
SELECT b.id, b.purpose, b.booking_date, b.start_time, c.room_number
FROM bookings b
JOIN classrooms c ON b.classroom_id = c.id
WHERE c.building_id IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
) AND b.status = 'pending'
ORDER BY b.created_at DESC;
```

✅ **Pass**: Pending bookings display

### Test 5.3: Approve a Booking

1. Click on a pending booking
2. Modal should show booking details:
   - User name
   - Room
   - Date and time
   - Purpose
   - Status: pending
3. Click "Approve Booking" button
4. Success message should appear
5. Booking should disappear from pending list

**Verify in SQL:**
```sql
SELECT status FROM bookings 
WHERE purpose = 'Study Group'
ORDER BY created_at DESC LIMIT 1;
-- Should show: confirmed
```

✅ **Pass**: Booking approved

### Test 5.4: Reject a Booking

1. Click on another pending booking
2. Click "Reject Booking" button
3. Booking should disappear from pending list

**Verify in SQL:**
```sql
SELECT status FROM bookings 
WHERE purpose = 'Study Group'
ORDER BY created_at DESC LIMIT 2;
-- One should show: rejected
```

✅ **Pass**: Booking rejected

### Test 5.5: Data Isolation

1. Create a booking in manager's building (Approve it)
2. Create a booking in ANOTHER building (via SQL):

```sql
-- Get a classroom NOT in manager's buildings
SELECT c.id FROM classrooms c
WHERE c.building_id NOT IN (
  SELECT building_id FROM user_buildings
  WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
)
LIMIT 1;

-- Create booking there
INSERT INTO bookings (user_id, classroom_id, booking_date, start_time, end_time, purpose, status)
VALUES (
  (SELECT id FROM users WHERE role = 'user' LIMIT 1),
  'CLASSROOM_ID',
  CURRENT_DATE + INTERVAL '1 day',
  '16:00',
  '17:30',
  'HIDDEN Booking',
  'pending'
);
```

3. Refresh manager's bookings page
4. The hidden booking should NOT appear

✅ **Pass**: Manager only sees bookings from their buildings

---

## Test 6: Navigation Between Pages (5 minutes)

**Goal:** Verify quick navigation works

### Test 6.1: Dashboard Quick Actions

1. From `/manager` dashboard
2. Click "Manage Schedules" → Should go to `/manager/schedules`
3. Click back or go to dashboard
4. Click "Manage Rooms" → Should go to `/manager/rooms`
5. Click back
6. Click "Booking Requests" → Should go to `/manager/bookings`

✅ **Pass**: All navigation works

### Test 6.2: Breadcrumbs/Back Navigation

1. On `/manager/schedules`
2. Should see a way back to dashboard
3. Click it → Should return to `/manager`

✅ **Pass**: Navigation complete

---

## Test 7: Performance & Data Volume (Optional, 10 minutes)

**Goal:** Test with realistic data amounts

### Test 7.1: Manager with Multiple Buildings

```sql
-- Assign manager to 3 buildings
SELECT u.id as manager_id
FROM users u
WHERE u.email = 'manager@dlsu.edu.ph';

-- Get 3 building IDs
SELECT id FROM buildings LIMIT 3;

-- Insert user_building records for each
INSERT INTO user_buildings (user_id, building_id)
VALUES 
  ('MANAGER_ID', 'BUILDING_ID_1'),
  ('MANAGER_ID', 'BUILDING_ID_2'),
  ('MANAGER_ID', 'BUILDING_ID_3')
ON CONFLICT DO NOTHING;
```

1. Refresh manager dashboard
2. Statistics should now include all 3 buildings
3. Navigation should still be responsive

✅ **Pass**: Dashboard handles multiple buildings

### Test 7.2: Large Booking List

1. Create 20+ bookings in manager's buildings:

```sql
INSERT INTO bookings (user_id, classroom_id, booking_date, start_time, end_time, purpose, status)
SELECT 
  (SELECT id FROM users WHERE role = 'user' LIMIT 1),
  (SELECT id FROM classrooms 
   WHERE building_id IN (
     SELECT building_id FROM user_buildings
     WHERE user_id = (SELECT id FROM users WHERE email = 'manager@dlsu.edu.ph')
   )
   LIMIT 1),
  CURRENT_DATE + (n || ' days')::INTERVAL,
  '08:00',
  '09:30',
  'Booking ' || n,
  'pending'
FROM generate_series(1, 20) as n;
```

2. Go to `/manager/bookings`
3. Page should load quickly (< 2 seconds)
4. Should have pagination or scrolling

✅ **Pass**: Handles large data sets

---

## Test 8: Browser Compatibility (5 minutes)

**Goal:** Verify dashboard works in different browsers

Test in:
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari (if Mac available)

Each should:
- Load all pages without errors
- Display responsive layout
- Forms should be submittable
- Modals should open/close smoothly

✅ **Pass**: Works in all browsers

---

## Test 9: Responsive Design (5 minutes)

**Goal:** Test mobile responsiveness

1. Open manager dashboard in Chrome
2. Press F12 to open DevTools
3. Click responsive design mode (or Ctrl+Shift+M)
4. Test viewport sizes:
   - [ ] 320px (Mobile)
   - [ ] 768px (Tablet)
   - [ ] 1920px (Desktop)

Should:
- Layout should adapt to screen size
- Navigation should be accessible on mobile
- Forms should be usable on all sizes
- No horizontal scrolling on small screens

✅ **Pass**: Responsive on all sizes

---

## Complete Test Checklist

| Test | Status | Time |
|------|--------|------|
| 1.1 - Regular user blocked | ⬜ | 2 min |
| 1.2 - Manager can access | ⬜ | 2 min |
| 1.3 - Admin can access | ⬜ | 2 min |
| 2.1 - Dashboard loads | ⬜ | 3 min |
| 2.2 - All elements display | ⬜ | 3 min |
| 2.3 - Data isolation | ⬜ | 3 min |
| 3.1 - View schedules | ⬜ | 3 min |
| 3.2 - Create schedule | ⬜ | 3 min |
| 3.3 - Update schedule | ⬜ | 3 min |
| 3.4 - Delete schedule | ⬜ | 3 min |
| 3.5 - Schedule isolation | ⬜ | 3 min |
| 4.1 - View rooms | ⬜ | 3 min |
| 4.2 - Edit room | ⬜ | 5 min |
| 4.3 - Room isolation | ⬜ | 3 min |
| 5.1 - Create bookings | ⬜ | 3 min |
| 5.2 - View bookings | ⬜ | 3 min |
| 5.3 - Approve booking | ⬜ | 3 min |
| 5.4 - Reject booking | ⬜ | 3 min |
| 5.5 - Booking isolation | ⬜ | 3 min |
| 6.1 - Quick actions | ⬜ | 3 min |
| 6.2 - Navigation | ⬜ | 2 min |
| 7.1 - Multiple buildings | ⬜ | 3 min |
| 7.2 - Large data sets | ⬜ | 3 min |
| 8 - Browser compat | ⬜ | 5 min |
| 9 - Responsive design | ⬜ | 5 min |

**Total Estimated Time**: 80-100 minutes

**Minimum Quick Test** (20 minutes):
- Test 1.1-1.3 (Access control)
- Test 2.1-2.2 (Dashboard)
- Test 3.1-3.2 (Schedules)
- Test 4.1-4.2 (Rooms)
- Test 5.2-5.3 (Bookings)

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 on `/manager` | Routes not created | Check if `app/manager/page.tsx` exists |
| Shows "Unauthorized" | Role not set to manager | Update role in `users` table |
| No data in lists | Not assigned to buildings | Check `user_buildings` table |
| CRUD buttons missing | API endpoints not created | Implement `/api/manager/*` routes |
| Slow performance | No indexes | Run migration 013 |
| CSS not loading | Tailwind issue | Rebuild: `npm run build` |

---

**Next Steps**: After passing all manager dashboard tests, move on to testing Rate Limiting (Requirement #3) and Re-Authentication (Requirement #4)
