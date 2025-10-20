import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  console.log('[API /api/heatmap/buildings] Starting request...')
  try {
    const supabase = await createClient()
    
    // Verify authentication
    console.log('[API] Verifying authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[API] User authenticated:', user.id)

    // Get target datetime from query params (optional, defaults to NOW())
    const searchParams = request.nextUrl.searchParams
    const targetDatetime = searchParams.get('datetime') || new Date().toISOString()
    console.log('[API] Target datetime:', targetDatetime)

    // Call the database function to get building occupancy
    console.log('[API] Calling get_building_occupancy RPC...')
    const { data, error } = await supabase.rpc('get_building_occupancy', {
      target_datetime: targetDatetime
    })

    if (error) {
      console.error('[API] Supabase RPC error:', error)
      console.error('[API] Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: 'Failed to fetch building occupancy', details: error }, { status: 500 })
    }

    console.log('[API] RPC Success - Buildings count:', data?.length || 0)
    if (data && data.length > 0) {
      console.log('[API] First building:', data[0])
    } else {
      console.warn('[API] No buildings returned from database')
      
      // Check if buildings table has data
      const { data: buildingsCheck, error: checkError } = await supabase
        .from('buildings')
        .select('id, name')
        .limit(5)
      
      console.log('[API] Buildings table check:', { count: buildingsCheck?.length, error: checkError })
      if (buildingsCheck && buildingsCheck.length > 0) {
        console.log('[API] Sample buildings:', buildingsCheck)
      }
    }

    return NextResponse.json({ buildings: data || [] }, { status: 200 })
  } catch (error) {
    console.error('[API] Unexpected error in buildings occupancy API:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}

