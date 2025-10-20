# 🗺️ Heat Map Feature - Quick Setup Guide

## ✅ What's Changed

The **layered heat map** is now the **main dashboard view**! When users log in, they immediately see the interactive campus heat map.

## 🚀 Setup Steps

### 1. Run the Fixed SQL Function in Supabase

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Fix the get_building_occupancy function (type mismatch fix)
CREATE OR REPLACE FUNCTION get_building_occupancy(
  target_datetime TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),  -- Changed from TEXT to VARCHAR(100)
  code VARCHAR(10),
  total_classrooms BIGINT,
  occupied_count BIGINT,
  available_count BIGINT,
  maintenance_count BIGINT,
  occupancy_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.code,
    COUNT(c.id) as total_classrooms,
    COUNT(c.id) FILTER (
      WHERE is_classroom_occupied(c.id, target_datetime) 
      OR c.current_status IN ('occupied', 'reserved')
    ) as occupied_count,
    COUNT(c.id) FILTER (
      WHERE NOT is_classroom_occupied(c.id, target_datetime) 
      AND c.current_status = 'available'
    ) as available_count,
    COUNT(c.id) FILTER (
      WHERE c.current_status = 'maintenance'
    ) as maintenance_count,
    ROUND(
      COUNT(c.id) FILTER (
        WHERE is_classroom_occupied(c.id, target_datetime) 
        OR c.current_status IN ('occupied', 'reserved')
      )::NUMERIC / 
      NULLIF(COUNT(c.id), 0),
      2
    ) as occupancy_rate
  FROM buildings b
  LEFT JOIN classrooms c ON c.building_id = b.id
  GROUP BY b.id, b.name, b.code
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 2. Enable Supabase Realtime

In **Supabase Dashboard** → **Database** → **Replication**:

Enable realtime for these tables:
- ✅ `bookings`
- ✅ `classrooms`
- ✅ `class_schedules`

### 3. Restart Your Dev Server

```bash
npm run dev
```

### 4. Test the Feature

1. Go to `http://localhost:3000/auth/login`
2. Log in with your account
3. You'll be redirected to `/dashboard` which now shows the **heat map**!

## 🎨 Features Available

### Level 1: Campus View (Default)
- Interactive campus map with building overlays
- Color-coded occupancy (🟢 green → 🟡 yellow → 🔴 red)
- Card-based building list
- Real-time updates
- **Click any building** to drill down

### Level 2: Building Floor View
- Floor selector sidebar
- Classroom grid with status colors
- Capacity and amenities info
- **Click any room** to see details

### Level 3: Room Detail View
- Timeline schedule (8 AM - 9 PM)
- Color-coded events (purple=class, red=booking)
- Quick booking button
- Date selector
- Room statistics

## 🔧 Navigation

The new header includes:
- **DLSU Classroom Finder** logo (home)
- **My Bookings** link
- **Admin** link (for admins only)
- User info + Logout button

## 📍 Routes

- `/dashboard` - **Main heat map** (new!)
- `/dashboard/heatmap` - Redirects to `/dashboard`
- `/dashboard/my-bookings` - User bookings
- `/admin` - Admin panel (admin only)

## 🐛 Troubleshooting

### "Door is not exported" Error
✅ **Fixed!** Changed to `DoorOpen` icon from lucide-react.

### "structure of query does not match" Error
✅ **Fixed!** Updated SQL function to return `VARCHAR(100)` instead of `TEXT`.

### Buildings not showing
- Check you have buildings in your database
- Run: `SELECT * FROM buildings;` in SQL Editor
- If empty, you need to seed building data

### Real-time not working
- Ensure Realtime is enabled for `bookings`, `classrooms`, `class_schedules`
- Check browser console for WebSocket errors

## 🎯 Next Steps

1. **Add building data** if you don't have any yet
2. **Add classroom data** for each building
3. **Customize campus map** positions in `CampusView.tsx`
4. **Add your campus map image** to `public/campus-map.png`

## 📖 Full Documentation

See `docs/HEATMAP_FEATURE.md` for complete documentation.

