'use client'

import { useEffect, useState } from 'react'
import { DoorOpen, Users, RefreshCw, Layers } from 'lucide-react'
import { FloorOccupancy, ClassroomWithStatus } from '@/types/heatmap'
import { createClient } from '@/lib/supabase/client'

interface BuildingViewProps {
  buildingId: string
  buildingName: string
  onRoomClick: (roomId: string, roomName: string) => void
}

export default function BuildingView({ buildingId, buildingName, onRoomClick }: BuildingViewProps) {
  const [floors, setFloors] = useState<FloorOccupancy[]>([])
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)
  const [classrooms, setClassrooms] = useState<ClassroomWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingClassrooms, setLoadingClassrooms] = useState(false)
  const supabase = createClient()

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available':
        return 'bg-green-500'
      case 'occupied':
        return 'bg-red-500'
      case 'maintenance':
        return 'bg-gray-500'
      case 'reserved':
        return 'bg-purple-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = (classroom: ClassroomWithStatus): string => {
    if (classroom.status === 'available') {
      return classroom.next_available_at 
        ? `Until ${classroom.next_available_at.slice(0, 5)}`
        : 'All day'
    }
    if (classroom.status === 'occupied' && classroom.occupied_until) {
      return `Until ${classroom.occupied_until.slice(0, 5)}`
    }
    return classroom.status.charAt(0).toUpperCase() + classroom.status.slice(1)
  }

  const fetchFloorOccupancy = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/heatmap/floors?buildingId=${buildingId}`)
      if (response.ok) {
        const data = await response.json()
        const floorData = data.floors || []
        setFloors(floorData)
        
        // Auto-select first floor
        if (floorData.length > 0 && selectedFloor === null) {
          setSelectedFloor(floorData[0].floor)
        }
      }
    } catch (error) {
      console.error('Error fetching floor occupancy:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClassrooms = async (floor: number) => {
    setLoadingClassrooms(true)
    try {
      const response = await fetch(`/api/heatmap/classrooms?buildingId=${buildingId}&floor=${floor}`)
      if (response.ok) {
        const data = await response.json()
        setClassrooms(data.classrooms || [])
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    } finally {
      setLoadingClassrooms(false)
    }
  }

  useEffect(() => {
    fetchFloorOccupancy()

    // Set up real-time subscription
    const channel = supabase
      .channel(`building-${buildingId}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchFloorOccupancy()
        if (selectedFloor !== null) {
          fetchClassrooms(selectedFloor)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms' }, () => {
        fetchFloorOccupancy()
        if (selectedFloor !== null) {
          fetchClassrooms(selectedFloor)
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [buildingId])

  useEffect(() => {
    if (selectedFloor !== null) {
      fetchClassrooms(selectedFloor)
    }
  }, [selectedFloor])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{buildingName}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Select a floor to view available classrooms
          </p>
        </div>
        
        <button
          onClick={() => {
            fetchFloorOccupancy()
            if (selectedFloor !== null) {
              fetchClassrooms(selectedFloor)
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Floor Selector Sidebar */}
        <div className="col-span-12 md:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Floors</h3>
            </div>
            
            <div className="space-y-2">
              {floors.map((floor) => (
                <button
                  key={floor.floor}
                  onClick={() => setSelectedFloor(floor.floor)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedFloor === floor.floor
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Floor {floor.floor}</span>
                    <span className="text-xs">
                      {floor.available_count}/{floor.total_classrooms}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 bg-white dark:bg-gray-600 bg-opacity-30 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-white dark:bg-blue-400 transition-all"
                        style={{ width: `${(floor.available_count / floor.total_classrooms) * 100}%` }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {floors.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No floors found
              </p>
            )}
          </div>
        </div>

        {/* Classroom Grid */}
        <div className="col-span-12 md:col-span-9">
          {selectedFloor !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Floor {selectedFloor} - Classrooms
                </h3>
                
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-gray-700 dark:text-gray-300">Occupied</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">Maintenance</span>
                  </div>
                </div>
              </div>

              {loadingClassrooms ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {classrooms.map((classroom) => (
                    <button
                      key={classroom.id}
                      onClick={() => onRoomClick(classroom.id, classroom.room_number)}
                      className="group relative bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500"
                    >
                      {/* Status indicator */}
                      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(classroom.status)}`} />
                      
                      <div className="flex flex-col items-center text-center">
                        <DoorOpen className={`w-8 h-8 mb-2 ${
                          classroom.status === 'available' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`} />
                        
                        <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                          {classroom.room_number}
                        </h4>
                        
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                          <Users className="w-3 h-3" />
                          <span>{classroom.capacity}</span>
                        </div>

                        <div className={`mt-2 text-xs font-medium ${
                          classroom.status === 'available'
                            ? 'text-green-600 dark:text-green-400'
                            : classroom.status === 'occupied'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {getStatusText(classroom)}
                        </div>

                        {/* Amenities badges */}
                        {classroom.amenities && classroom.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {classroom.amenities.slice(0, 2).map((amenity, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                              >
                                {amenity}
                              </span>
                            ))}
                            {classroom.amenities.length > 2 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                                +{classroom.amenities.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Hover effect */}
                      <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 rounded-lg transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {classrooms.length === 0 && !loadingClassrooms && (
                <div className="text-center py-12">
                  <DoorOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No classrooms found on this floor</p>
                </div>
              )}
            </div>
          )}

          {selectedFloor === null && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Select a Floor
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a floor from the sidebar to view classrooms
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

