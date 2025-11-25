'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, ChevronLeft, ChevronRight, Edit, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Room {
  id: string
  building_id: string
  building?: { name: string }
  room_number: string
  floor: number
  capacity: number
  amenities: string[]
  status: 'available' | 'occupied' | 'maintenance'
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchRooms()
  }, [pagination.page])

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get manager's building IDs
      const { data: userBuildings } = await supabase
        .from('user_buildings')
        .select('building_id')
        .eq('user_id', user.id)

      const buildingIds = userBuildings?.map(ub => ub.building_id) || []

      const offset = (pagination.page - 1) * pagination.limit

      const { data: roomsData, count } = await supabase
        .from('classrooms')
        .select('*, building:buildings(*)', { count: 'exact' })
        .in('building_id', buildingIds.length > 0 ? buildingIds : ['null'])
        .range(offset, offset + pagination.limit - 1)
        .order('floor', { ascending: true })
        .order('room_number', { ascending: true })

      setRooms(roomsData || [])
      setPagination({
        ...pagination,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pagination.limit)
      })
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
      toast({
        title: 'Error',
        description: 'Failed to load rooms',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRoom = async (formData: FormData) => {
    if (!selectedRoom) return

    try {
      const roomData = {
        capacity: parseInt(formData.get('capacity') as string),
        amenities: (formData.get('amenities') as string).split(',').map(a => a.trim()),
        status: formData.get('status')
      }

      const response = await fetch(`/api/manager/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Room updated successfully'
        })
        setShowEditModal(false)
        setSelectedRoom(null)
        fetchRooms()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to update room',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update room',
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'occupied':
        return 'bg-yellow-100 text-yellow-800'
      case 'maintenance':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Rooms</h1>
              <p className="text-sm text-gray-600 mt-1">Update room details and status</p>
            </div>
            <Link
              href="/manager"
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Manager
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Rooms Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Classrooms ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8" />
                No rooms found in your assigned buildings.
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {rooms.map(room => (
                    <div key={room.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{room.building?.name}</h3>
                          <p className="text-sm text-gray-600">Room {room.room_number}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(room.status)}`}>
                          {room.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3 space-y-1">
                        <p>Floor: {room.floor}</p>
                        <p>Capacity: {room.capacity} people</p>
                        <p className="text-xs">
                          Amenities: {room.amenities?.length > 0 ? room.amenities.join(', ') : 'None'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRoom(room)
                          setShowEditModal(true)
                        }}
                        className="w-full"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({...pagination, page: Math.max(1, pagination.page - 1)})}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({...pagination, page: Math.min(pagination.totalPages, pagination.page + 1)})}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Room Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleUpdateRoom(new FormData(e.currentTarget))
              }}
              className="space-y-4"
            >
              <div>
                <Label>Building</Label>
                <p className="text-sm font-medium text-gray-900">{selectedRoom.building?.name}</p>
              </div>
              <div>
                <Label>Room Number</Label>
                <p className="text-sm font-medium text-gray-900">{selectedRoom.room_number}</p>
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  defaultValue={selectedRoom.capacity}
                  required
                />
              </div>
              <div>
                <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                <Input
                  id="amenities"
                  name="amenities"
                  defaultValue={selectedRoom.amenities?.join(', ') || ''}
                  placeholder="e.g., Projector, Whiteboard, AC"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={selectedRoom.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Update Room</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
