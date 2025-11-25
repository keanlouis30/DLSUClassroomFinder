'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Check, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Booking {
  id: string
  user_id: string
  user?: { name: string; email: string }
  classroom_id: string
  classroom?: { name: string; code: string }
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: 'pending' | 'confirmed' | 'rejected'
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [approving, setApproving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchBookings()
  }, [pagination.page])

  const fetchBookings = async () => {
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

      // Get classrooms in manager's buildings
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id')
        .in('building_id', buildingIds.length > 0 ? buildingIds : ['null'])

      const classroomIds = classrooms?.map(c => c.id) || []

      // Get bookings for those classrooms
      const { data: bookingsData, count } = await supabase
        .from('bookings')
        .select('*, user:users(*), classroom:classrooms(*)', { count: 'exact' })
        .in('classroom_id', classroomIds.length > 0 ? classroomIds : ['null'])
        .eq('status', 'pending')
        .range(offset, offset + pagination.limit - 1)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })

      setBookings(bookingsData || [])
      setPagination({
        ...pagination,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pagination.limit)
      })
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveBooking = async (bookingId: string) => {
    setApproving(true)
    try {
      const response = await fetch(`/api/manager/bookings/${bookingId}/approve`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Booking approved'
        })
        setShowDetailModal(false)
        setSelectedBooking(null)
        fetchBookings()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to approve booking',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve booking',
        variant: 'destructive'
      })
    } finally {
      setApproving(false)
    }
  }

  const handleRejectBooking = async (bookingId: string) => {
    setApproving(true)
    try {
      const response = await fetch(`/api/manager/bookings/${bookingId}/reject`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Booking rejected'
        })
        setShowDetailModal(false)
        setSelectedBooking(null)
        fetchBookings()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to reject booking',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject booking',
        variant: 'destructive'
      })
    } finally {
      setApproving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
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
              <h1 className="text-2xl font-bold text-gray-900">Booking Requests</h1>
              <p className="text-sm text-gray-600 mt-1">Review and approve pending bookings</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Pending Bookings ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending bookings at this time.
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {bookings.map(booking => (
                    <div
                      key={booking.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => {
                        setSelectedBooking(booking)
                        setShowDetailModal(true)
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {booking.classroom?.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {booking.user?.name} ({booking.user?.email})
                          </p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="font-medium text-gray-900">
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Time</p>
                          <p className="font-medium text-gray-900">
                            {booking.start_time} - {booking.end_time}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Purpose</p>
                          <p className="font-medium text-gray-900">{booking.purpose}</p>
                        </div>
                      </div>
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

      {/* Booking Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Classroom</p>
                  <p className="font-medium text-gray-900">{selectedBooking.classroom?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Code</p>
                  <p className="font-medium text-gray-900">{selectedBooking.classroom?.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Student Name</p>
                  <p className="font-medium text-gray-900">{selectedBooking.user?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-gray-900 text-sm">{selectedBooking.user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedBooking.booking_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-medium text-gray-900">
                    {selectedBooking.start_time} - {selectedBooking.end_time}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Purpose</p>
                <p className="font-medium text-gray-900">{selectedBooking.purpose}</p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleApproveBooking(selectedBooking.id)}
                  disabled={approving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleRejectBooking(selectedBooking.id)}
                  disabled={approving}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
