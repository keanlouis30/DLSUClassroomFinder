import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bookingId = params.id;

  // Get booking
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status !== 'pending') {
    return NextResponse.json(
      { error: 'Booking is not in pending status' },
      { status: 400 }
    );
  }

  // Check if within check-in window (15 minutes before to start time)
  const now = new Date();
  const bookingDate = new Date(booking.booking_date);
  const [startHour, startMin] = booking.start_time.split(':').map(Number);
  const startTime = new Date(bookingDate);
  startTime.setHours(startHour, startMin, 0);

  const fifteenMinutesBefore = new Date(startTime.getTime() - 15 * 60000);

  if (now < fifteenMinutesBefore || now > startTime) {
    return NextResponse.json(
      { error: 'Check-in window is 15 minutes before start time' },
      { status: 400 }
    );
  }

  // Update booking status
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'checked_in',
      checked_in_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'booking_checked_in',
    resource_type: 'booking',
    resource_id: bookingId,
  });

  return NextResponse.json(updatedBooking);
}

