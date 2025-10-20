'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

export default function TestAuthPage() {
  const [status, setStatus] = useState<string>('Checking...')
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      setStatus('User is signed in!')
      
      // Check if user exists in database
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (dbError) {
        setError(`Database error: ${dbError.message}`)
      } else if (dbUser) {
        setStatus('User exists in both auth and database!')
      } else {
        setError('User exists in auth but NOT in database - trigger failed!')
      }
    } else {
      setStatus('No user signed in')
    }
  }

  const testGoogleLogin = async () => {
    setStatus('Starting Google OAuth...')
    setError(null)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/test-auth`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          hd: 'dlsu.edu.ph',
        },
      },
    })

    if (error) {
      setError(`OAuth Error: ${error.message}`)
      setStatus('OAuth failed')
    } else {
      setStatus('Redirecting to Google...')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setStatus('Signed out')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">🔍 OAuth Debug Page</h1>
        
        {/* Status */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="font-semibold">Status:</p>
          <p className="font-mono">{status}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
            <p className="font-semibold text-red-700">Error:</p>
            <p className="font-mono text-red-600">{error}</p>
          </div>
        )}

        {/* User Info */}
        {user && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
            <p className="font-semibold text-green-700">✅ Auth User:</p>
            <pre className="mt-2 text-sm overflow-auto">
              {JSON.stringify({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.user_metadata?.full_name,
                created_at: user.created_at,
              }, null, 2)}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {!user ? (
            <button
              onClick={testGoogleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded"
            >
              Test Google Sign In
            </button>
          ) : (
            <>
              <button
                onClick={checkUser}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded"
              >
                Recheck User Status
              </button>
              <button
                onClick={signOut}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded"
              >
                Sign Out
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
          <p className="font-semibold mb-2">📋 Debug Steps:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Test Google Sign In"</li>
            <li>Sign in with your @dlsu.edu.ph email</li>
            <li>You'll be redirected back here</li>
            <li>Check if the error appears</li>
            <li>See if user exists in auth but not database</li>
          </ol>
        </div>

        {/* Environment Check */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="font-semibold mb-2">🔧 Environment:</p>
          <p className="text-sm font-mono">
            Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
          </p>
          <p className="text-sm font-mono">
            App URL: {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  )
}

