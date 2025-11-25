'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Users, Wifi, Monitor, AirVent, AlertCircle, BookOpen } from 'lucide-react'
import { ClassroomWithStatus, ScheduleEvent } from '@/types/heatmap'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface RoomDetailProps {
  roomId: string
  roomName: string
  buildingId: string
}

export default function RoomDetail({ roomId, roomName, buildingId }: RoomDetailProps) {
  const [classroom, setClassroom] = useState<ClassroomWithStatus | null>(null)
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  console.log('[RoomDetail] Component mounted with props:', { roomId, roomName, buildingId })

  const handleBookRoom = () => {
    router.push(`/dashboard/bookings?classroomId=${roomId}&date=${selectedDate}`)
  }

  // Time slots for the day (8 AM to 8 PM)
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8
    return `${hour.toString().padStart(2, '0')}:00`
  })

  const amenityIcons: Record<string, any> = {
    'WiFi': Wifi,
    'Projector': Monitor,
    'AC': AirVent,
    'Whiteboard': BookOpen,
  }

  const fetchClassroomDetails = async () => {
    try {
      console.log('[RoomDetail] Fetching classroom details for ID:', roomId)
      const response = await fetch(`/api/heatmap/classroom?id=${roomId}`)
      console.log('[RoomDetail] API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[RoomDetail] Received classroom data:', data)
        if (data.classroom) {
          setClassroom(data.classroom)
        }
      } else if (response.status === 404) {
        console.error('[RoomDetail] Classroom not found (404)')
      } else {
        const errorData = await response.json()
        console.error('[RoomDetail] Error response:', errorData)
      }
    } catch (error) {
      console.error('[RoomDetail] Error fetching classroom details:', error)
    }
  }

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/heatmap/schedule?classroomId=${roomId}&date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setSchedule(data.schedule || [])
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassroomDetails()
    fetchSchedule()

    // Set up real-time subscription
    const channel = supabase
      .channel(`room-${roomId}-schedule`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings', filter: `classroom_id=eq.${roomId}` },
        () => {
          fetchSchedule()
          fetchClassroomDetails()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, selectedDate])

  const getEventPosition = (startTime: string, endTime: string) => {
    const start = parseInt(startTime.split(':')[0]) + parseInt(startTime.split(':')[1]) / 60
    const end = parseInt(endTime.split(':')[0]) + parseInt(endTime.split(':')[1]) / 60
    
    const dayStart = 8 // 8 AM
    const dayEnd = 21 // 9 PM
    const totalHours = dayEnd - dayStart
    
    const top = ((start - dayStart) / totalHours) * 100
    const height = ((end - start) / totalHours) * 100
    
    return { top: `${top}%`, height: `${height}%` }
  }

  const getEventColor = (event: ScheduleEvent) => {
    if (event.event_type === 'class') {
      return 'bg-purple-500 border-purple-600'
    }
    switch (event.status) {
      case 'confirmed':
      case 'checked_in':
        return 'bg-red-500 border-red-600'
      case 'pending':
        return 'bg-yellow-500 border-yellow-600'
      default:
        return 'bg-gray-500 border-gray-600'
    }
  }

  if (!classroom) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Room Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Room {roomName}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                classroom.status === 'available'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : classroom.status === 'occupied'
                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}>
                {classroom.status.charAt(0).toUpperCase() + classroom.status.slice(1)}
              </span>
            </div>

            <div className="flex items-center gap-6 mt-4 text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="font-medium">{classroom.capacity} people</span>
              </div>
              {classroom.occupied_until && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>Occupied until {classroom.occupied_until.slice(0, 5)}</span>
                </div>
              )}
              {classroom.next_available_at && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Next booking at {classroom.next_available_at.slice(0, 5)}</span>
                </div>
              )}
            </div>

            {/* Amenities */}
            {classroom.amenities && classroom.amenities.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {classroom.amenities.map((amenity, idx) => {
                    const Icon = amenityIcons[amenity] || Monitor
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{amenity}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Info Message - No Student Booking */}
          {classroom.status === 'available' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>Available - For Official Use Only</span>
              </div>
              
              <Button
                onClick={handleBookRoom}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Book This Room
              </Button>
            </div>
          )}

          {classroom.status !== 'available' && (
            <Button
              onClick={handleBookRoom}
              disabled
              className="bg-gray-400 text-white cursor-not-allowed"
            >
              Not Available
            </Button>
          )}
        </div>
      </div>

      {/* Schedule Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Daily Schedule
            </h3>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500" />
            <span className="text-gray-700 dark:text-gray-300">Scheduled Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-gray-700 dark:text-gray-300">Confirmed Booking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-gray-700 dark:text-gray-300">Pending Booking</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="relative">
            {/* Timeline grid */}
            <div className="space-y-0 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="relative h-16 border-b border-gray-100 dark:border-gray-700"
                >
                  <span className="absolute -left-16 top-0 text-sm text-gray-500 dark:text-gray-400 w-12 text-right">
                    {time}
                  </span>
                </div>
              ))}
            </div>

            {/* Events overlay */}
            <div className="absolute top-0 left-4 right-0 bottom-0 pointer-events-none">
              {schedule.map((event, idx) => {
                const position = getEventPosition(event.start_time, event.end_time)
                return (
                  <div
                    key={idx}
                    className={`absolute left-0 right-4 ${getEventColor(event)} border-l-4 rounded-r-lg p-3 shadow-md pointer-events-auto`}
                    style={position}
                  >
                    <div className="text-white">
                      <div className="font-semibold text-sm">{event.title}</div>
                      <div className="text-xs mt-1 opacity-90">
                        {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                      </div>
                      {event.user_name && (
                        <div className="text-xs mt-1 opacity-75">{event.user_name}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {schedule.length === 0 && !loading && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No events scheduled for this day</p>
            {classroom.status === 'available' && (
              <Button
                onClick={handleBookRoom}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Book This Room
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Booking Guidelines */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Booking Guidelines
          </h3>
          
          {/* Important Notice */}
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
              ⚠️ Classroom Usage Policy
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Classrooms are reserved for <strong>official university purposes only</strong> (scheduled classes, exams, official events). Students should use library facilities for studying.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">Official Use Only:</span>
                <span className="block text-xs mt-0.5">Scheduled classes, university exams, official events, and approved activities</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">Student Study:</span>
                <span className="block text-xs mt-0.5">Please use library facilities - classrooms are not available for student bookings</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">Viewing Only:</span>
                <span className="block text-xs mt-0.5">This system shows availability for informational purposes</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Room Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Capacity</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {classroom.capacity} people
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Floor</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                Floor {classroom.floor}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Events Today</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {schedule.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <span className={`font-semibold ${
                classroom.status === 'available'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {classroom.status.charAt(0).toUpperCase() + classroom.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

