'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader } from 'lucide-react'

interface ReAuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  actionName: string
  requiresPassword?: boolean
}

export function ReAuthDialog({
  open,
  onOpenChange,
  onSuccess,
  actionName,
  requiresPassword = false
}: ReAuthDialogProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleReAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || !user.email) {
        setError('User not found')
        return
      }

      if (requiresPassword && password) {
        // Verify password using Supabase signInWithPassword
        // Note: This requires the user to know their password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password
        })

        if (signInError) {
          setError('Password verification failed. Please try again.')
          setPassword('')
          return
        }
      }

      // Log the admin action for audit purposes
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: `admin_${actionName.toLowerCase().replace(/\s+/g, '_')}_re_authenticated`,
        resource_type: 'admin',
        resource_id: user.id,
        details: {
          action: actionName,
          timestamp: new Date().toISOString(),
          ip_address: 'N/A'
        }
      })

      // Create a short-lived session token for this operation
      const sessionToken = btoa(JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
        action: actionName,
        // Token expires in 5 minutes
        expiresAt: Date.now() + 5 * 60 * 1000
      }))

      // Store in session storage (not persistent)
      sessionStorage.setItem(`reauth_${actionName}`, sessionToken)

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Re-auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Critical Action</DialogTitle>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-900">Security Verification Required</h4>
            <p className="text-sm text-amber-800 mt-1">
              This action requires you to verify your identity for security purposes.
            </p>
            <p className="text-sm text-amber-800 mt-2">
              <strong>Action:</strong> {actionName}
            </p>
          </div>
        </div>

        <form onSubmit={handleReAuth} className="space-y-4">
          {requiresPassword && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Your password is required for critical admin operations
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setPassword('')
                setError(null)
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
              Verify & Continue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Hook to check if user has valid re-auth session for an action
export function useReAuthVerification(actionName: string) {
  const isValidSession = () => {
    const token = sessionStorage.getItem(`reauth_${actionName}`)
    if (!token) return false

    try {
      const data = JSON.parse(atob(token))
      // Check if token hasn't expired
      return data.expiresAt > Date.now()
    } catch {
      return false
    }
  }

  const clearSession = () => {
    sessionStorage.removeItem(`reauth_${actionName}`)
  }

  return { isValidSession, clearSession }
}
