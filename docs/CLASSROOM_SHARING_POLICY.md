# Classroom Sharing Policy

## Overview

To ensure fair access to classroom resources and prevent monopolization, students must book classrooms for **valid academic group purposes only**. Individual/solo studying should be conducted in library facilities.

## Policy Statement

**Classrooms are shared resources for collaborative academic activities.**

Students cannot monopolize entire classrooms for individual use. All bookings require:
- A valid academic purpose
- Minimum 2 attendees
- Clear educational justification

## Valid Booking Purposes

### ✅ Accepted Purposes

1. **Group Study** - Study sessions with 2+ students
2. **Project Meeting** - Collaborative project work
3. **Review Session** - Exam preparation with study groups
4. **Org Activity** - Student organization meetings/activities
5. **Presentation Prep** - Group presentation practice
6. **Tutoring** - Peer tutoring sessions
7. **Workshop** - Student-led workshops

### ❌ NOT Accepted

- Solo studying (use library instead)
- Individual work
- Personal entertainment
- Non-academic activities

## Booking Requirements

### Required Information

When booking a classroom, students must provide:

```typescript
{
  purpose: 'group_study' | 'project_meeting' | 'review_session' | 
           'org_activity' | 'presentation_prep' | 'tutoring' | 'workshop',
  purpose_details?: string,  // Optional: Additional context
  estimated_attendees: number  // Minimum: 2
}
```

### Validation Rules

1. **Purpose** - Must be one of the valid purposes listed above
2. **Attendees** - Minimum 2 people required
3. **Duration** - Maximum 3 hours per session
4. **Frequency** - Maximum 2 active bookings per day

## Database Schema

### New Fields in `bookings` Table

```sql
purpose VARCHAR(50) NOT NULL
  CHECK (purpose IN (
    'group_study', 'project_meeting', 'review_session',
    'org_activity', 'presentation_prep', 'tutoring', 'workshop'
  ))

purpose_details TEXT  -- Optional description

estimated_attendees INTEGER NOT NULL DEFAULT 1
  CHECK (estimated_attendees >= 2)
```

## Implementation

### Database Migration

Run this migration in Supabase SQL Editor:

```bash
supabase/migrations/009_add_booking_purpose.sql
```

### UI Updates

**Room Detail Page:**
- Prominent "Classroom Sharing Policy" notice
- Purpose selection required during booking
- Attendee count input (min: 2)
- Clear examples of valid purposes

**Booking Form (Future):**
```typescript
<select name="purpose" required>
  <option value="">Select purpose...</option>
  <option value="group_study">Group Study (2+ students)</option>
  <option value="project_meeting">Project Meeting</option>
  <option value="review_session">Review/Exam Prep</option>
  <option value="org_activity">Organization Activity</option>
  <option value="presentation_prep">Presentation Practice</option>
  <option value="tutoring">Tutoring Session</option>
  <option value="workshop">Workshop</option>
</select>

<input 
  type="number" 
  name="estimated_attendees" 
  min="2" 
  required 
  placeholder="How many people? (min: 2)"
/>

<textarea 
  name="purpose_details" 
  placeholder="Optional: Provide more details (e.g., subject, project name)"
/>
```

## Enforcement

### Automatic Validation

- **Database constraints** prevent invalid bookings
- **API validation** rejects bookings without valid purpose
- **Minimum attendee check** enforces group requirement

### Manager Review

Managers can:
- View booking purposes in dashboard
- Flag suspicious single-person bookings
- Cancel bookings that violate policy
- Generate reports by purpose type

### Analytics

View booking statistics:

```sql
SELECT * FROM booking_analytics;
```

Shows:
- Most common purposes
- Average attendees per purpose
- Completion rates by purpose
- User patterns

## Rationale

### Why This Policy?

1. **Fair Access** - Prevents individuals from monopolizing limited classroom space
2. **Proper Resource Use** - Directs solo students to library facilities designed for individual study
3. **Collaboration** - Encourages group learning and academic collaboration
4. **Transparency** - Creates accountability through purpose tracking

### Benefits

- ✅ More efficient use of classroom space
- ✅ Better availability for group activities
- ✅ Clear expectations for students
- ✅ Data-driven resource planning
- ✅ Reduced booking conflicts

## User Education

### Display This Message

Show on booking pages, room detail pages, and dashboard:

> **📚 Classroom Sharing Policy**
> 
> Classrooms are shared resources. Book only for valid academic purposes:
> - Group study (2+ students)
> - Project meetings
> - Review sessions
> - Organization activities
> 
> Solo studying? Please use the library facilities.

### FAQ

**Q: Can I book for just me and one friend?**
A: Yes! Two people meet the minimum requirement for group activities.

**Q: What if I'm working on a solo project?**
A: Please use library facilities. Classrooms are for group activities.

**Q: Can I bring extra people to my booked session?**
A: Yes! You're welcome to have more attendees than estimated.

**Q: What if I get caught booking for solo study?**
A: Your booking may be cancelled, and repeated violations may result in booking privileges being suspended.

## For Developers

### Booking API Validation

```typescript
// Example validation in booking API
const bookingSchema = z.object({
  classroom_id: z.string().uuid(),
  booking_date: z.date(),
  start_time: z.string(),
  end_time: z.string(),
  purpose: z.enum([
    'group_study',
    'project_meeting',
    'review_session',
    'org_activity',
    'presentation_prep',
    'tutoring',
    'workshop'
  ]),
  purpose_details: z.string().optional(),
  estimated_attendees: z.number().min(2).max(100),
});
```

### Audit Logging

Log purpose information:

```typescript
await logAudit({
  user_id: user.id,
  action: 'booking_created',
  resource_type: 'booking',
  resource_id: booking.id,
  details: {
    purpose: booking.purpose,
    estimated_attendees: booking.estimated_attendees,
  }
});
```

## Future Enhancements

- [ ] Purpose verification during check-in
- [ ] Attendee QR code confirmation
- [ ] Purpose-based room recommendations
- [ ] Group booking templates
- [ ] Peer review system for booking quality

## Related Documentation

- `WARP.md` - Main project documentation
- `docs/HEATMAP_FEATURE.md` - Heat map system
- `supabase/migrations/009_add_booking_purpose.sql` - Database changes

