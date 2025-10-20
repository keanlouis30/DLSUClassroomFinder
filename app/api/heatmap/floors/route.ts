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
    const buildingId = searchParams.get('buildingId')
    const targetDatetime = searchParams.get('datetime') || new Date().toISOString()

    if (!buildingId) {
      return NextResponse.json({ error: 'buildingId is required' }, { status: 400 })
    }

    // Call the database function to get floor occupancy
    const { data, error } = await supabase.rpc('get_floor_occupancy', {
      building_uuid: buildingId,
      target_datetime: targetDatetime
    })

    if (error) {
      console.error('Error fetching floor occupancy:', error)
      return NextResponse.json({ error: 'Failed to fetch floor occupancy' }, { status: 500 })
    }

    return NextResponse.json({ floors: data || [] }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in floors occupancy API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

