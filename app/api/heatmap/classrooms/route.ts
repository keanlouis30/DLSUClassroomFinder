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
    const floor = searchParams.get('floor')
    const targetDatetime = searchParams.get('datetime') || new Date().toISOString()

    if (!buildingId || !floor) {
      return NextResponse.json({ error: 'buildingId and floor are required' }, { status: 400 })
    }

    // Call the database function to get classrooms with status
    const { data, error } = await supabase.rpc('get_classrooms_with_status', {
      building_uuid: buildingId,
      floor_number: parseInt(floor),
      target_datetime: targetDatetime
    })

    if (error) {
      console.error('Error fetching classrooms:', error)
      return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 })
    }

    return NextResponse.json({ classrooms: data || [] }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in classrooms API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

