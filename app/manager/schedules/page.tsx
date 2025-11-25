'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Classroom {
  id: string
  room_number: string
  building?: { name: string } | { name: string }[]
}

interface Schedule {
  id: string
  classroom_id: string
  classroom?: Classroom
  day_of_week: string
  start_time: string
  end_time: string
  subject_code: string
  instructor_name: string
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [pagination.page])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user logged in')
        return
      }
      console.log('Current user:', user.id, user.email)

      // Get manager's building IDs
      const { data: userBuildings, error: buildingError } = await supabase
        .from('user_buildings')
        .select('building_id')
        .eq('user_id', user.id)

      console.log('User buildings result:', { data: userBuildings, error: buildingError })

      if (buildingError) {
        console.error('Error fetching user buildings:', buildingError)
        toast({
          title: 'Error',
          description: `Failed to fetch user buildings: ${buildingError.message}`,
          variant: 'destructive'
        })
        setClassrooms([])
        setSchedules([])
        return
      }

      const buildingIds = userBuildings?.map(ub => ub.building_id) || []
      console.log('Building IDs:', buildingIds)

      // If no buildings assigned, show empty state
      if (buildingIds.length === 0) {
        console.warn('No buildings assigned to this user')
        toast({
          title: 'No Buildings',
          description: 'No buildings have been assigned to your account. Please contact an administrator.',
          variant: 'default'
        })
        setClassrooms([])
        setSchedules([])
        setPagination({ ...pagination, total: 0, totalPages: 0 })
        return
      }

      // Fetch classrooms for the dropdown
      const { data: classroomsData, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, room_number, building:buildings(name)')
        .in('building_id', buildingIds)

      console.log('Classrooms result:', { data: classroomsData, error: classroomError })

      if (classroomError) {
        console.error('Error fetching classrooms:', classroomError)
        toast({
          title: 'Error',
          description: `Failed to fetch classrooms: ${classroomError.message}`,
          variant: 'destructive'
        })
        setClassrooms([])
      } else {
        console.log('Successfully fetched classrooms:', classroomsData?.length)
        setClassrooms(classroomsData || [])
      }

      const offset = (pagination.page - 1) * pagination.limit
      const classroomIds = classroomsData?.map(c => c.id) || []

      // Get schedules for those classrooms
      let schedulesQuery = supabase
        .from('class_schedules')
        .select('*, classroom:classrooms(id, room_number, building:buildings(name))', { count: 'exact' })

      if (classroomIds.length > 0) {
        schedulesQuery = schedulesQuery.in('classroom_id', classroomIds)
      } else {
        // No classrooms, return empty
        setSchedules([])
        setPagination({ ...pagination, total: 0, totalPages: 0 })
        setLoading(false)
        return
      }

      const { data: schedulesData, count, error: scheduleError } = await schedulesQuery
        .range(offset, offset + pagination.limit - 1)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (scheduleError) {
        console.error('Error fetching schedules:', scheduleError)
        setSchedules([])
      } else {
        setSchedules(schedulesData || [])
        setPagination({
          ...pagination,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pagination.limit)
        })
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
      toast({
        title: 'Error',
        description: 'Failed to load schedules',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const scheduleData = {
        classroom_id: formData.get('classroom_id') as string,
        day_of_week: formData.get('day_of_week') as string,
        start_time: formData.get('start_time') as string,
        end_time: formData.get('end_time') as string,
        subject_code: formData.get('subject_code') as string,
        instructor_name: formData.get('instructor_name') as string
      }

      // Validate times
      if (!scheduleData.start_time || !scheduleData.end_time || scheduleData.start_time >= scheduleData.end_time) {
        toast({
          title: 'Error',
          description: 'End time must be after start time',
          variant: 'destructive'
        })
        return
      }

      const { data, error } = await supabase
        .from('class_schedules')
        .insert([scheduleData])
        .select()

      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create schedule',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Success',
        description: 'Schedule created successfully'
      })
      setShowCreateModal(false)
      ;(e.target as HTMLFormElement).reset()
      // Reset to first page and fetch
      setPagination({ ...pagination, page: 1 })
      await fetchData()
    } catch (error) {
      console.error('Error creating schedule:', error)
      toast({
        title: 'Error',
        description: 'Failed to create schedule',
        variant: 'destructive'
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', scheduleId)

      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete schedule',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Success',
        description: 'Schedule deleted successfully'
      })
      await fetchData()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive'
      })
    }
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Schedules</h1>
              <p className="text-sm text-gray-600 mt-1">Create and manage class schedules</p>
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
        {/* Action Bar */}
        <div className="mb-6">
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Schedule</DialogTitle>
                <DialogDescription>
                  Add a new class schedule to your classroom
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div>
                  <Label htmlFor="classroom_id">Classroom</Label>
                  <Select name="classroom_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select classroom" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.length === 0 ? (
                        <SelectItem value="none" disabled>No classrooms available</SelectItem>
                      ) : (
                        classrooms.map(classroom => {
                          const buildingName = Array.isArray(classroom.building) ? (classroom.building[0] as any)?.name : (classroom.building as any)?.name
                          return (
                            <SelectItem key={classroom.id} value={classroom.id}>
                              {classroom.room_number} - {buildingName || 'Unknown Building'}
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="day_of_week">Day of Week</Label>
                  <Select name="day_of_week" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input id="start_time" name="start_time" type="time" required />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input id="end_time" name="end_time" type="time" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject_code">Subject Code</Label>
                  <Input id="subject_code" name="subject_code" placeholder="e.g., CS101" required />
                </div>
                <div>
                  <Label htmlFor="instructor_name">Instructor Name</Label>
                  <Input id="instructor_name" name="instructor_name" placeholder="e.g., Dr. Smith" required />
                </div>
                <Button type="submit" className="w-full" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Create Schedule'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Schedules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Class Schedules ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading schedules...</div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No schedules found. Create one to get started.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Classroom</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Building</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Day</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Time</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Subject</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Instructor</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map(schedule => (
                        <tr key={schedule.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{schedule.classroom?.room_number}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {Array.isArray(schedule.classroom?.building) ? (schedule.classroom.building[0] as any)?.name : (schedule.classroom?.building as any)?.name}
                          </td>
                          <td className="py-3 px-4">{schedule.day_of_week}</td>
                          <td className="py-3 px-4">{schedule.start_time} - {schedule.end_time}</td>
                          <td className="py-3 px-4">{schedule.subject_code}</td>
                          <td className="py-3 px-4">{schedule.instructor_name}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="text-red-600 hover:text-red-700 inline-flex"
                              title="Delete schedule"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
    </div>
  )
}
