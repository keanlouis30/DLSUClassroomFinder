import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Building2, LogOut, Calendar, User } from 'lucide-react';
import LayeredHeatMap from '@/components/heatmap/LayeredHeatMap';
import LastLogin from '@/components/last_login/LastLogin';

import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  console.log('[Dashboard] Auth User ID:', user.id);
  console.log('[Dashboard] Auth User Email:', user.email);

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  console.log('[Dashboard] Profile fetch error:', profileError?.message || 'None');
  console.log('[Dashboard] Profile data:', profile);
  console.log('[Dashboard] User role:', profile?.role || 'NOT FOUND');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                DLSU Classroom Finder
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Real-time Campus Availability</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-2">
              <Link
                href="/dashboard/my-bookings"
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
              >
                <Calendar className="h-4 w-4" />
                <span>My Bookings</span>
              </Link>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition"
                >
                  <User className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>

            {/* User Info */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {profile?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {profile?.role || 'user'}
              </p>
              <LastLogin />
            </div>
            
            {/* Logout */}
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Heat Map */}
      <div className="flex-1 overflow-hidden">
        <LayeredHeatMap />
      </div>
    </div>
  );
}

