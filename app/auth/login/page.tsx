'use client'

import { createClient } from '@/lib/supabase/client'
import FaultyTerminal from '@/components/FaultyTerminal'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    setSessionId(Math.random().toString(36).substring(2, 15))
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          hd: 'dlsu.edu.ph', // Restrict to DLSU domain
        },
      },
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Terminal Background */}
      <div className="absolute inset-0 z-0">
        {mounted && <FaultyTerminal />}
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70 z-10" />

      {/* Content */}
      <div className="relative z-20 min-h-screen flex flex-col">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-[#00ff41] hover:text-[#00ff41]/80 font-mono transition-colors"
          >
            <span className="mr-2">&lt;</span>
            [ BACK TO MAIN ]
          </Link>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Terminal Box */}
            <div className="bg-black/80 backdrop-blur-sm border-2 border-[#00ff41] rounded-lg p-8 shadow-2xl shadow-[#00ff41]/20">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="mb-6 font-mono text-[#00ff41] text-sm animate-pulse">
                  [AUTHENTICATION REQUIRED]
                </div>
                <h1 className="text-4xl font-bold text-[#00ff41] mb-3 font-mono">
                  &gt; LOGIN_
                </h1>
                <p className="text-white/70 font-mono text-sm">
                  $ authenticate --provider=google --domain=dlsu.edu.ph
                </p>
              </div>

              {/* Terminal Prompt */}
              <div className="mb-6 font-mono text-sm text-[#00ff41]/80 space-y-1">
                <div>&gt; Checking credentials...</div>
                <div>&gt; Validating domain...</div>
                <div className="flex items-center">
                  <span>&gt; Status:</span>
                  <span className="ml-2 text-white">AWAITING_INPUT</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded border-2 border-red-500 bg-red-500/10">
                  <p className="text-red-400 font-mono text-sm">
                    [ERROR] {error}
                  </p>
                </div>
              )}

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-[#00ff41] rounded bg-[#1b5e20] hover:bg-[#2e7d32] text-white font-mono transition-all shadow-lg shadow-[#00ff41]/20 hover:shadow-[#00ff41]/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>
                  {loading ? '[ AUTHENTICATING... ]' : '[ SIGN IN WITH GOOGLE ]'}
                </span>
              </button>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded">
                <div className="font-mono text-xs text-[#00ff41] space-y-1">
                  <div className="flex items-start">
                    <span className="mr-2">&gt;</span>
                    <p>
                      <span className="text-white">RESTRICTION:</span> Only @dlsu.edu.ph email addresses are authorized.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <span className="mr-2">&gt;</span>
                    <p>
                      <span className="text-white">SECURITY:</span> OAuth 2.0 with domain verification enabled.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-[#00ff41]/20 text-center">
                <p className="text-[#00ff41]/60 font-mono text-xs">
                  &gt; Secure authentication powered by Supabase
                </p>
              </div>
            </div>

            {/* System Info */}
            {mounted && sessionId && (
              <div className="mt-6 text-center">
                <div className="inline-block bg-black/60 backdrop-blur-sm border border-[#00ff41]/30 rounded px-4 py-2">
                  <p className="text-[#00ff41]/70 font-mono text-xs">
                    SESSION_ID: {sessionId}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

