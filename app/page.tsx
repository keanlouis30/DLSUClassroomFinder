'use client'

import Link from 'next/link'
import FaultyTerminal from '@/components/FaultyTerminal'
import { useEffect, useState } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Terminal Background */}
      <div className="absolute inset-0 z-0">
        {mounted && <FaultyTerminal />}
      </div>

      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />

      {/* Content */}
      <div className="relative z-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-32 md:py-40">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8 text-[#1b5e20] font-mono text-sm animate-pulse">
              <span className="inline-block">[SYSTEM ONLINE]</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-[#00ff41] mb-6 font-mono tracking-tight leading-tight">
              &gt; DLSU_CLASSROOM
              <br />
              <span className="text-white">&gt; FINDER_</span>
            </h1>
            <p className="text-xl md:text-2xl text-[#00ff41]/80 mb-12 font-mono">
              $ locate --available --realtime --book
            </p>
            <p className="text-lg text-white/70 mb-12 max-w-2xl mx-auto">
              Real-time classroom availability tracking system for DLSU students.
              Find. Book. Study.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/login">
                <button className="text-lg px-10 py-6 bg-[#1b5e20] hover:bg-[#2e7d32] text-white border-2 border-[#00ff41]/30 font-mono shadow-lg shadow-[#00ff41]/20 transition-all hover:shadow-[#00ff41]/40 rounded">
                  [ INITIALIZE SESSION ]
                </button>
              </Link>
              <a href="#features">
                <button className="text-lg px-10 py-6 bg-transparent hover:bg-[#00ff41]/10 text-[#00ff41] border-2 border-[#00ff41] font-mono transition-all rounded">
                  [ VIEW SYSTEM INFO ]
                </button>
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-20">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-[#00ff41] mb-4 font-mono">
              &gt; SYSTEM_FEATURES
            </h2>
            <div className="w-24 h-1 bg-[#00ff41] mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-black/60 backdrop-blur-sm p-8 rounded-lg border-2 border-[#00ff41]/30 hover:border-[#00ff41] transition-all">
              <div className="text-5xl mb-6 text-[#00ff41] font-mono">[📡]</div>
              <h3 className="text-xl font-semibold mb-3 text-[#00ff41] font-mono">
                &gt; REALTIME_SYNC
              </h3>
              <p className="text-white/70 leading-relaxed">
                Live classroom status updates. Zero latency. Maximum accuracy.
              </p>
            </div>
            <div className="bg-black/60 backdrop-blur-sm p-8 rounded-lg border-2 border-[#00ff41]/30 hover:border-[#00ff41] transition-all">
              <div className="text-5xl mb-6 text-[#00ff41] font-mono">[🔍]</div>
              <h3 className="text-xl font-semibold mb-3 text-[#00ff41] font-mono">
                &gt; ADVANCED_QUERY
              </h3>
              <p className="text-white/70 leading-relaxed">
                Filter by capacity, amenities, building. Smart search algorithms.
              </p>
            </div>
            <div className="bg-black/60 backdrop-blur-sm p-8 rounded-lg border-2 border-[#00ff41]/30 hover:border-[#00ff41] transition-all">
              <div className="text-5xl mb-6 text-[#00ff41] font-mono">[⚡]</div>
              <h3 className="text-xl font-semibold mb-3 text-[#00ff41] font-mono">
                &gt; INSTANT_BOOKING
              </h3>
              <p className="text-white/70 leading-relaxed">
                Reserve in seconds. Conflict detection. Auto check-in system.
              </p>
            </div>
          </div>
        </section>

        {/* System Stats Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-black/60 backdrop-blur-sm border-2 border-[#00ff41]/30 rounded-lg p-8 md:p-12">
              <div className="font-mono text-[#00ff41] space-y-2 mb-8">
                <div className="flex justify-between items-center">
                  <span>&gt; System Status:</span>
                  <span className="text-white">OPERATIONAL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>&gt; Active Users:</span>
                  <span className="text-white">2,847</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>&gt; Classrooms Tracked:</span>
                  <span className="text-white">342</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>&gt; Uptime:</span>
                  <span className="text-white">99.97%</span>
                </div>
              </div>
              <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                <div className="h-full w-[97%] bg-gradient-to-r from-[#1b5e20] to-[#00ff41] animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="bg-gradient-to-br from-[#1b5e20] to-[#0d3d11] border-2 border-[#00ff41] rounded-2xl p-12 text-center max-w-3xl mx-auto shadow-2xl shadow-[#00ff41]/20">
            <div className="font-mono text-[#00ff41] text-sm mb-4">
              [ACCESS_GRANTED]
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white font-mono">
              &gt; AUTHENTICATE_NOW
            </h2>
            <p className="text-white/80 mb-8 text-lg">
              Join the network. Access real-time data. Reserve your space.
            </p>
            <Link href="/auth/login">
              <button className="text-lg px-12 py-6 bg-black hover:bg-black/80 text-[#00ff41] border-2 border-[#00ff41] font-mono shadow-lg transition-all hover:shadow-[#00ff41]/60 rounded">
                [ LOGIN WITH DLSU ACCOUNT ]
              </button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 text-center">
          <div className="text-[#00ff41]/60 font-mono text-sm">
            <p>&gt; DLSU Classroom Finder v1.0.0</p>
            <p className="mt-2">&gt; Secure Web Development Project | 2024-2025</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

