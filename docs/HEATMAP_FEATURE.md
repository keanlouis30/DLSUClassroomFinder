# Layered Heat Map Feature

## Overview

The layered heat map provides a three-level drill-down interface for visualizing and exploring classroom availability across the DLSU campus.

## Features

### Level 1: Campus View
- **Interactive campus map** with building overlays
- **Color-coded occupancy** indicators:
  - 🟢 Green (0-30%): Low occupancy
  - 🟡 Yellow (30-70%): Medium occupancy  
  - 🔴 Red (70-100%): High occupancy
- **Real-time updates** via Supabase Realtime
- **Card-based list view** as alternative to map
- Click any building to drill down to floor view

### Level 2: Building View
- **Floor selector sidebar** showing occupancy per floor
- **Classroom grid** with visual status indicators
- **Real-time availability** updates
- Shows:
  - Room number and capacity
  - Current status (available/occupied/maintenance)
  - Time until next booking or availability
  - Amenities badges
- Click any classroom to view detailed schedule

### Level 3: Room Detail
- **Timeline schedule view** (8 AM - 9 PM)
- **Visual event blocks** showing:
  - Purple: Scheduled classes
  - Red: Confirmed bookings
  - Yellow: Pending bookings
- **Room information**:
  - Capacity and floor
  - Amenities with icons
  - Current status
  - Occupancy details
- **Quick booking** button for available rooms
- **Date selector** to view different days
- **Booking guidelines** and room statistics

## Database Schema

The feature uses these new SQL functions:

1. `is_classroom_occupied(uuid, timestamptz)` - Check if a room is occupied
2. `get_classroom_status(uuid, timestamptz)` - Get detailed room status
3. `get_building_occupancy(timestamptz)` - Get occupancy stats per building
4. `get_floor_occupancy(uuid, timestamptz)` - Get occupancy stats per floor
5. `get_classrooms_with_status(uuid, int, timestamptz)` - Get rooms for a floor with status
6. `get_classroom_schedule(uuid, date)` - Get daily schedule for a room

## API Endpoints

- `GET /api/heatmap/buildings` - Get all buildings with occupancy
- `GET /api/heatmap/floors?buildingId={id}` - Get floors for a building
- `GET /api/heatmap/classrooms?buildingId={id}&floor={n}` - Get classrooms for a floor
- `GET /api/heatmap/schedule?classroomId={id}&date={date}` - Get schedule for a room

## Usage

### Accessing the Heat Map

Navigate to: `/dashboard/heatmap`

### Navigation

Use the breadcrumb navigation at the top:
- **Campus** - Return to campus overview
- **Building Name** - Return to building view  
- **Room Number** - Current room detail

Or click the back button to navigate up one level.

### Real-time Updates

The heat map automatically updates when:
- Bookings are created, modified, or cancelled
- Classroom status changes
- Check-ins/check-outs occur

Updates happen via:
1. Supabase Realtime subscriptions (instant)
2. Fallback polling every 30 seconds
3. Manual refresh button

## Customization

### Campus Map Positioning

To adjust building positions on the campus map, edit `CampusView.tsx`:

```typescript
const buildingPositions: Record<string, { x: number; y: number; width: number; height: number }> = {
  'St. La Salle Hall': { x: 120, y: 340, width: 215, height: 70 },
  // Add your buildings here...
}
```

Coordinates are in SVG viewBox units (0-960 x 0-540).

### Campus Map Image

To use your actual campus map image:

1. Add your map image to `public/campus-map.png`
2. Update `CampusView.tsx` line ~126:

```tsx
<img src="/campus-map.png" alt="Campus Map" className="w-full absolute inset-0" />
```

### Color Thresholds

Adjust occupancy color thresholds in `CampusView.tsx`:

```typescript
const getHeatColor = (occupancyRate: number): string => {
  if (occupancyRate < 0.3) return 'rgb(34, 197, 94)' // Green
  if (occupancyRate < 0.7) return 'rgb(234, 179, 8)' // Yellow
  return 'rgb(239, 68, 68)' // Red
}
```

### Timeline Hours

Adjust the timeline view hours in `RoomDetail.tsx`:

```typescript
// Change from 8 AM - 8 PM to your preferred range
const timeSlots = Array.from({ length: 13 }, (_, i) => {
  const hour = i + 8 // Start hour
  return `${hour.toString().padStart(2, '0')}:00`
})
```

## Migration

To apply the database functions, run:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration file directly
psql -d your_database -f supabase/migrations/008_heatmap_functions.sql
```

## Performance Considerations

### Caching
- Building occupancy queries are cached for 30 seconds
- Floor and classroom data updates in real-time

### Optimization
- Indexed queries for fast occupancy calculation
- STABLE functions for query planner optimization
- Efficient RLS policies

### Scaling
If performance becomes an issue with many classrooms:
1. Add materialized views for occupancy statistics
2. Implement Redis caching for API responses
3. Use database connection pooling

## Security

All API routes:
- ✅ Require authentication
- ✅ Use Supabase RLS policies
- ✅ Validate input parameters
- ✅ Log errors server-side only

## Troubleshooting

### Buildings not showing occupancy
- Check that buildings have classrooms associated
- Verify RLS policies allow reading classrooms
- Check browser console for API errors

### Real-time updates not working
- Ensure Supabase Realtime is enabled for your tables
- Check browser console for WebSocket errors
- Verify RLS policies don't block realtime events

### Timeline events not displaying
- Check that event times are within 8 AM - 9 PM range
- Verify schedule data has correct format (HH:MM:SS)
- Ensure bookings have status 'confirmed' or 'checked_in'

## Future Enhancements

Potential additions:
- [ ] Export campus occupancy as PDF/PNG
- [ ] Historical occupancy trends and analytics
- [ ] Predictive availability using ML
- [ ] Mobile-optimized touch interactions
- [ ] Accessibility improvements (keyboard navigation)
- [ ] Filter by amenities or capacity
- [ ] Favorites/bookmarks for frequent rooms

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify database migration applied successfully
3. Ensure environment variables are set correctly
4. Check Supabase dashboard for realtime connection status

