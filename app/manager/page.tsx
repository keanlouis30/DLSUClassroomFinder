import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Calendar, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function ManagerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!['manager', 'admin'].includes(profile?.role || '')) {
    redirect('/dashboard');
  }

  // Get manager's assigned buildings
  const { data: buildings } = await supabase
    .from('user_buildings')
    .select('buildings(*)')
    .eq('user_id', user.id);

  const assignedBuildings = buildings?.map((b: any) => b.buildings) || [];

  // Get statistics for assigned buildings
  const buildingIds = assignedBuildings.map((b: any) => b.id);

  const { count: classroomCount } = await supabase
    .from('classrooms')
    .select('*', { count: 'exact', head: true })
    .in('building_id', buildingIds.length > 0 ? buildingIds : ['null']);

  const { count: pendingBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .in('classroom_id', buildingIds.length > 0 ? buildingIds : ['null'])
    .eq('status', 'pending');

  const { data: scheduleConflicts } = await supabase
    .rpc('get_schedule_conflicts', {
      manager_id: user.id
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Manage schedules, rooms, and bookings</p>
            </div>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, {profile?.name || 'Manager'}
          </h2>
          <p className="text-gray-600 mt-2">
            {assignedBuildings.length > 0 
              ? `Managing ${assignedBuildings.length} building${assignedBuildings.length !== 1 ? 's' : ''}`
              : 'No buildings assigned yet'}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Buildings</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedBuildings.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Classrooms</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classroomCount || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBookings || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schedule Conflicts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scheduleConflicts?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/manager/schedules">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Manage Schedules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Create and manage class schedules, set room availability
                </p>
                <p className="text-sm text-blue-600 font-medium">View Schedules →</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/manager/rooms">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Manage Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Update room details, amenities, and capacity
                </p>
                <p className="text-sm text-blue-600 font-medium">View Rooms →</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/manager/bookings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Booking Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Review and approve pending booking requests
                </p>
                <p className="text-sm text-blue-600 font-medium">View Requests →</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Assigned Buildings */}
        {assignedBuildings.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assigned Buildings</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedBuildings.map((building: any) => (
                <Card key={building.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{building.name}</CardTitle>
                    <p className="text-sm text-gray-600">{building.code}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{building.location || 'No location specified'}</p>
                    <Link
                      href={`/manager/buildings/${building.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 block"
                    >
                      Manage Building →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {assignedBuildings.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">No Buildings Assigned</h3>
            <p className="text-sm text-blue-800">
              You don't have any buildings assigned yet. Contact an administrator to assign buildings to your account.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
