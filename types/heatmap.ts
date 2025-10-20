export interface BuildingOccupancy {
  id: string
  name: string
  code: string
  total_classrooms: number
  occupied_count: number
  available_count: number
  maintenance_count: number
  occupancy_rate: number
}

export interface FloorOccupancy {
  floor: number
  total_classrooms: number
  occupied_count: number
  available_count: number
  occupancy_rate: number
}

export interface ClassroomWithStatus {
  id: string
  room_number: string
  floor: number
  capacity: number
  amenities: string[]
  is_occupied: boolean
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  occupied_until: string | null
  next_available_at: string | null
}

export interface ScheduleEvent {
  event_type: 'booking' | 'class'
  start_time: string
  end_time: string
  title: string
  status: string
  user_name: string | null
}

export type ViewLevel = 'campus' | 'building' | 'room'

