'use client'

import { useEffect, useState } from 'react'
import { Building2, RefreshCw } from 'lucide-react'
import { BuildingOccupancy } from '@/types/heatmap'
import { createClient } from '@/lib/supabase/client'

interface CampusViewProps {
  onBuildingClick: (buildingId: string, buildingName: string) => void
}

export default function CampusView({ onBuildingClick }: CampusViewProps) {
  const [buildings, setBuildings] = useState<BuildingOccupancy[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  // SVG coordinates for each building (precisely matched to DLSU campus map)
  const buildingPositions: Record<string, { x: number; y: number; width: number; height: number }> = {
    // Top row (North side)
    'Faculty Center': { x: 363, y: 45, width: 93, height: 60 },
    'St. Joseph Hall': { x: 310, y: 120, width: 225, height: 58 },
    
    // Left side buildings
    'Br. Connon Hall': { x: 48, y: 250, width: 100, height: 65 },
    'Don Enrique T. Yuchengco Hall': { x: 215, y: 205, width: 130, height: 75 },
    
    // Center-left - St. La Salle Hall with its field (extended to align with BC)
    'St. La Salle Hall': { x: 48, y: 340, width: 287, height: 150 },
    
    // Center buildings (main cluster)
    'Henry Sy Sr. Hall': { x: 350, y: 245, width: 205, height: 265 },
    'Velasco Hall': { x: 565, y: 220, width: 50, height: 290 },
    
    // Right side of center
    'St. Miguel Hall': { x: 625, y: 175, width: 85, height: 150 },
    
    // Far right buildings
    'Science and Technology Research Center': { x: 755, y: 130, width: 50, height: 180 },
    'Enrique M. Razon Sports Center': { x: 850, y: 100, width: 110, height: 155 },
    'Br. Andrew Gonzalez Hall': { x: 850, y: 290, width: 110, height: 185 },
    
    // South/Center-right - Gokongwei Hall
    'Gokongwei Hall': { x: 720, y: 320, width: 120, height: 150 },
  }

  const getHeatColor = (occupancyRate: number): string => {
    if (occupancyRate < 0.3) return 'rgb(34, 197, 94)' // green-500
    if (occupancyRate < 0.7) return 'rgb(234, 179, 8)' // yellow-500
    return 'rgb(239, 68, 68)' // red-500
  }

  const fetchBuildingOccupancy = async () => {
    console.log('[CampusView] Fetching building occupancy...')
    setLoading(true)
    try {
      const response = await fetch('/api/heatmap/buildings')
      console.log('[CampusView] API Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[CampusView] API Response data:', data)
        console.log('[CampusView] Buildings count:', data.buildings?.length || 0)
        
        if (data.buildings && data.buildings.length > 0) {
          console.log('[CampusView] First building:', data.buildings[0])
        } else {
          console.warn('[CampusView] No buildings returned from API')
        }
        
        setBuildings(data.buildings || [])
        setLastUpdated(new Date())
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[CampusView] API Error response:', errorData)
      }
    } catch (error) {
      console.error('[CampusView] Error fetching building occupancy:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchBuildingOccupancy()

    // Set up real-time subscription
    const channel = supabase
      .channel('building-occupancy-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBuildingOccupancy()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms' }, () => {
        fetchBuildingOccupancy()
      })
      .subscribe()

    // Fallback polling every 30 seconds
    const interval = setInterval(fetchBuildingOccupancy, 30000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header with Legend and Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Campus Heat Map</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Click on any building to view detailed availability
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-gray-700 dark:text-gray-300">Low (0-30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-gray-700 dark:text-gray-300">Medium (30-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-gray-700 dark:text-gray-300">High (70-100%)</span>
            </div>
          </div>

          <button
            onClick={fetchBuildingOccupancy}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {mounted && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Campus Map with Interactive Overlay */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="relative w-full max-w-6xl mx-auto">
          {/* Clean campus heat map - buildings only */}
          <div className="relative aspect-[16/9] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 960 540">
              
              {/* Draw building overlays */}
              {buildings.map((building) => {
                const pos = buildingPositions[building.name]
                if (!pos) return null

                const color = getHeatColor(building.occupancy_rate)
                
                return (
                  <g key={building.id}>
                    {/* Building rectangle */}
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={pos.width}
                      height={pos.height}
                      fill={color}
                      opacity={0.75}
                      stroke="white"
                      strokeWidth="3"
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onBuildingClick(building.id, building.name)}
                    />
                    
                    {/* Building label */}
                    <text
                      x={pos.x + pos.width / 2}
                      y={pos.y + pos.height / 2 - 10}
                      textAnchor="middle"
                      className="text-xs font-bold pointer-events-none select-none"
                      fill="white"
                      style={{ fontSize: '12px' }}
                    >
                      {building.code || building.name.split(' ')[0]}
                    </text>
                    
                    {/* Occupancy percentage */}
                    <text
                      x={pos.x + pos.width / 2}
                      y={pos.y + pos.height / 2 + 10}
                      textAnchor="middle"
                      className="text-lg font-bold pointer-events-none select-none"
                      fill="white"
                      style={{ fontSize: '16px' }}
                    >
                      {Math.round(building.occupancy_rate * 100)}%
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Building List View (Alternative/Supplementary) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings.map((building) => (
          <button
            key={building.id}
            onClick={() => onBuildingClick(building.id, building.name)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getHeatColor(building.occupancy_rate) }}
              >
                <Building2 className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {building.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {building.available_count} / {building.total_classrooms} available
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${building.occupancy_rate * 100}%`,
                        backgroundColor: getHeatColor(building.occupancy_rate),
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {Math.round(building.occupancy_rate * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {loading && buildings.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}
    </div>
  )
}

