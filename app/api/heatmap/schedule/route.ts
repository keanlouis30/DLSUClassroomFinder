import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const classroomId = searchParams.get('classroomId')
    const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!classroomId) {
      return NextResponse.json({ error: 'classroomId is required' }, { status: 400 })
    }

    // Call the database function to get classroom schedule
    const { data, error } = await supabase.rpc('get_classroom_schedule', {
      classroom_uuid: classroomId,
      target_date: targetDate
    })

    if (error) {
      console.error('Error fetching classroom schedule:', error)
      return NextResponse.json({ error: 'Failed to fetch classroom schedule' }, { status: 500 })
    }

    return NextResponse.json({ schedule: data || [] }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in schedule API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

