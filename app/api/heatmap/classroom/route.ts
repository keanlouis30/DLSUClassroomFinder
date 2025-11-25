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
    const classroomId = searchParams.get('id')
    const targetDatetime = searchParams.get('datetime') || new Date().toISOString()

    if (!classroomId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    console.log('[API /api/heatmap/classroom] Fetching classroom:', classroomId)

    // First, get the classroom's floor and building_id
    const { data: classroomData, error: classroomError } = await supabase
      .from('classrooms')
      .select('floor, building_id')
      .eq('id', classroomId)
      .single()

    if (classroomError || !classroomData) {
      console.error('[API] Error fetching classroom floor/building:', classroomError)
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    console.log('[API] Found classroom - Floor:', classroomData.floor, 'Building:', classroomData.building_id)

    // Now call the database function to get classroom with status
    const { data, error } = await supabase.rpc('get_classrooms_with_status', {
      building_uuid: classroomData.building_id,
      floor_number: classroomData.floor,
      target_datetime: targetDatetime
    })

    if (error) {
      console.error('[API] Error fetching classroom details from RPC:', error)
      return NextResponse.json({ error: 'Failed to fetch classroom details' }, { status: 500 })
    }

    console.log('[API] RPC returned', data?.length || 0, 'classrooms')

    // Find the specific classroom in the results
    const classroom = data?.find((c: any) => c.id === classroomId)

    if (!classroom) {
      console.error('[API] Classroom not found in RPC results')
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    console.log('[API] Found classroom in RPC results')

    return NextResponse.json({ classroom }, { status: 200 })
  } catch (error) {
    console.error('[API] Unexpected error in classroom API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
