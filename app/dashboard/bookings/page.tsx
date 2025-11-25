'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Classroom {
  id: string
  room_number: string
  capacity: number
  floor: number
  amenities: string[]
  buildings: {
    name: string
    code: string
  }
}

export default function BookingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const classroomId = searchParams.get('classroomId')
  const dateParam = searchParams.get('date')
  
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    date: dateParam || new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '09:00',
    purpose: 'group_study',
    purposeDetails: '',
    estimatedAttendees: 2,
  })

  const supabase = createClient()

  // Fetch classroom details
  useEffect(() => {
    async function fetchClassroom() {
      if (!classroomId) {
        setError('No classroom selected')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/heatmap/classroom?id=${classroomId}`)
        if (response.ok) {
          const data = await response.json()
          // Need to fetch building info separately
          const { data: classroomData } = await supabase
            .from('classrooms')
            .select(`
              *,
              buildings (name, code)
            `)
            .eq('id', classroomId)
            .single()
          
          if (classroomData) {
            setClassroom(classroomData as Classroom)
          }
        } else {
          setError('Classroom not found')
        }
      } catch (err) {
        console.error('Error fetching classroom:', err)
        setError('Failed to load classroom details')
      } finally {
        setLoading(false)
      }
    }

    fetchClassroom()
  }, [classroomId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('[BookingPage] Submit clicked')
    console.log('[BookingPage] classroomId:', classroomId)
    console.log('[BookingPage] formData:', formData)
    
    if (!classroomId) {
      setError('No classroom selected')
      console.error('[BookingPage] No classroomId')
      return
    }

    // Validation
    if (formData.startTime >= formData.endTime) {
      const msg = 'End time must be after start time'
      setError(msg)
      console.error('[BookingPage]', msg)
      return
    }

    const [startHour, startMin] = formData.startTime.split(':').map(Number)
    const [endHour, endMin] = formData.endTime.split(':').map(Number)
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)

    console.log('[BookingPage] Duration:', durationMinutes, 'minutes')

    if (durationMinutes > 180) {
      const msg = 'Maximum booking duration is 3 hours'
      setError(msg)
      console.error('[BookingPage]', msg)
      return
    }

    if (durationMinutes < 30) {
      const msg = 'Minimum booking duration is 30 minutes'
      setError(msg)
      console.error('[BookingPage]', msg)
      return
    }

    // Check booking date
    const bookingDate = new Date(formData.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (bookingDate < today) {
      const msg = 'Cannot book in the past'
      setError(msg)
      console.error('[BookingPage]', msg)
      return
    }

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 7)
    if (bookingDate > maxDate) {
      const msg = 'Cannot book more than 7 days in advance'
      setError(msg)
      console.error('[BookingPage]', msg)
      return
    }

    console.log('[BookingPage] All validations passed, submitting booking')
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        classroom_id: classroomId,
        booking_date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        purpose: formData.purpose,
        purpose_details: formData.purposeDetails || null,
        estimated_attendees: formData.estimatedAttendees,
      }
      
      console.log('[BookingPage] Sending payload:', payload)
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('[BookingPage] Response status:', response.status)

      const data = await response.json()
      
      console.log('[BookingPage] Response data:', data)

      if (!response.ok) {
        const errorMsg = typeof data.error === 'string' 
          ? data.error 
          : JSON.stringify(data.error) || 'Failed to create booking'
        setError(errorMsg)
        console.error('[BookingPage] Booking failed:', errorMsg)
        return
      }

      console.log('[BookingPage] Booking created successfully')
      setSuccess(true)
      // Redirect to my bookings after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/my-bookings')
      }, 2000)
    } catch (err) {
      console.error('[BookingPage] Error creating booking:', err)
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Classroom Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'Please select a classroom from the heatmap'}
            </p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Book a Classroom</h1>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-200">Booking Created!</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your booking request has been submitted. Redirecting to your bookings...
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Classroom Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Classroom Details
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Building</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {classroom.buildings.name}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Room Number</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {classroom.room_number}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Floor</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {classroom.floor}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Capacity</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {classroom.capacity} people
              </p>
            </div>
          </div>

          {/* Amenities */}
          {classroom.amenities && classroom.amenities.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {classroom.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Booking Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Bookings must be within the next 7 days
              </p>
            </div>

            {/* Time Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>

            {/* Duration Display */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Duration:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {(() => {
                    const [startHour, startMin] = formData.startTime.split(':').map(Number)
                    const [endHour, endMin] = formData.endTime.split(':').map(Number)
                    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
                    const hours = Math.floor(durationMinutes / 60)
                    const minutes = durationMinutes % 60
                    return `${hours}h ${minutes}m`
                  })()}
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum: 30 minutes | Maximum: 3 hours
              </p>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Booking Purpose *
              </label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="group_study">Group Study (2+ students)</option>
                <option value="project_meeting">Project Meeting</option>
                <option value="review_session">Review/Exam Prep Session</option>
                <option value="org_activity">Student Organization Activity</option>
                <option value="presentation_prep">Presentation Preparation</option>
                <option value="tutoring">Peer Tutoring</option>
                <option value="workshop">Student-Led Workshop</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Classrooms are for official academic purposes only. Solo studying should use library facilities.
              </p>
            </div>

            {/* Purpose Details */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Additional Details (Optional)
              </label>
              <textarea
                value={formData.purposeDetails}
                onChange={(e) => setFormData({ ...formData, purposeDetails: e.target.value })}
                placeholder="e.g., CS101 Project, Math 201 Study Group, etc."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Estimated Attendees */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Estimated Number of Attendees *
              </label>
              <input
                type="number"
                min="2"
                max="999"
                value={formData.estimatedAttendees}
                onChange={(e) => setFormData({ ...formData, estimatedAttendees: parseInt(e.target.value) || 2 })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum 2 people required (classrooms are for group activities, not solo study)
              </p>
            </div>

            {/* Important Note */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                ⚠️ Booking Policies
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                <li>Maximum 2 bookings per day</li>
                <li>Bookings are for official university purposes only</li>
                <li>Minimum 2 attendees required (classroom sharing policy)</li>
                <li>Your booking will be in pending status until approved by a manager</li>
                <li>Conflicts with scheduled classes will be rejected</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={submitting || success}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                    Creating Booking...
                  </>
                ) : (
                  'Create Booking'
                )}
              </Button>

              <Link href="/dashboard" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
