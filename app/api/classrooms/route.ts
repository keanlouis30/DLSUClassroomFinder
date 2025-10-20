import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const building_id = searchParams.get('building_id');
  const status = searchParams.get('status');
  const floor = searchParams.get('floor');

  let query = supabase
    .from('classrooms')
    .select(`
      *,
      buildings (*)
    `)
    .order('room_number');

  if (building_id) {
    query = query.eq('building_id', building_id);
  }

  if (status) {
    query = query.eq('current_status', status);
  }

  if (floor) {
    query = query.eq('floor', parseInt(floor));
  }

  const { data: classrooms, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(classrooms);
}

