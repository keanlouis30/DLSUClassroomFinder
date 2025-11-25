import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const BookingSchema = z.object({
  classroom_id: z.string().uuid(),
  booking_date: z.string(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  purpose: z.enum(['group_study', 'project_meeting', 'review_session', 'org_activity', 'presentation_prep', 'tutoring', 'workshop']),
  purpose_details: z.string().max(200, "Additional details cannot exceed 200 characters").optional().nullable(),
  estimated_attendees: z.number().int().min(2),
});

// need to test the logging as well 

// GET: Fetch user's bookings
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('bookings')
    .select(`
      *,
      classrooms (
        *,
        buildings (*)
      )
    `)
    .eq('user_id', user.id)
    .order('booking_date', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: bookings, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(bookings);
}

// POST: Create new booking
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = BookingSchema.parse(body);

    // Check if booking date is within 7 days
    const bookingDate = new Date(validated.booking_date);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    if (bookingDate > maxDate) {
      return NextResponse.json(
        { error: 'Cannot book more than 7 days in advance' },
        { status: 400 }
      );
    }

    // Check booking duration (max 3 hours)
    const [startHour, startMin] = validated.start_time.split(':').map(Number);
    const [endHour, endMin] = validated.end_time.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    if (durationMinutes > 180) {
      return NextResponse.json(
        { error: 'Maximum booking duration is 3 hours' },
        { status: 400 }
      );
    }

    // Check user's daily booking limit (2 bookings per day)
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('booking_date', validated.booking_date)
      .in('status', ['pending', 'confirmed', 'checked_in']);

    if ((count || 0) >= 2) {
      return NextResponse.json(
        { error: 'Daily booking limit reached (2 bookings per day)' },
        { status: 400 }
      );
    }

    // Check for conflicts with existing bookings
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('classroom_id', validated.classroom_id)
      .eq('booking_date', validated.booking_date)
      .neq('status', 'cancelled')
      .neq('status', 'auto_cancelled');

    const hasTimeConflict = existingBookings?.some(booking => {
      return (
        (validated.start_time >= booking.start_time && validated.start_time < booking.end_time) ||
        (validated.end_time > booking.start_time && validated.end_time <= booking.end_time) ||
        (validated.start_time <= booking.start_time && validated.end_time >= booking.end_time)
      );
    });

    if (hasTimeConflict) {
      return NextResponse.json(
        { error: 'Time slot conflicts with existing booking' },
        { status: 400 }
      );
    }

    // Check for conflicts with class schedules
    const dayOfWeek = bookingDate.getDay();
    const { data: schedules } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('classroom_id', validated.classroom_id)
      .contains('days_of_week', [dayOfWeek])
      .lte('start_date', validated.booking_date)
      .gte('end_date', validated.booking_date);

    const hasScheduleConflict = schedules?.some(schedule => {
      return (
        (validated.start_time >= schedule.start_time && validated.start_time < schedule.end_time) ||
        (validated.end_time > schedule.start_time && validated.end_time <= schedule.end_time) ||
        (validated.start_time <= schedule.start_time && validated.end_time >= schedule.end_time)
      );
    });

    if (hasScheduleConflict) {
      return NextResponse.json(
        { error: 'Time slot conflicts with scheduled class' },
        { status: 400 }
      );
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        ...validated,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'booking_created',
      resource_type: 'booking',
      resource_id: booking.id,
      details: validated,
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

