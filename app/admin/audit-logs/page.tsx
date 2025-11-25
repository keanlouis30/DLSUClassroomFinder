'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Filter, Download, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface AuditLog {
  id: string
  action: string
  resource_type: string
  resource_id?: string
  details?: any
  ip_address?: string
  timestamp: string
  user: {
    name: string
    email: string
    role: string
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    date_from: '',
    date_to: '',
    user_id: '',
    email: ''
  })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showLogDetail, setShowLogDetail] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, filters])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value
          return acc
        }, {} as Record<string, string>)
      })

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        export: format,
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value
          return acc
        }, {} as Record<string, string>)
      })

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit_logs.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: 'Success',
          description: `Audit logs exported as ${format.toUpperCase()}`
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export audit logs',
        variant: 'destructive'
      })
    }
  }

  const getActionBadgeColor = (action: string) => {
    if (action.includes('login') || action.includes('created')) return 'bg-green-100 text-green-800'
    if (action.includes('updated') || action.includes('modified')) return 'bg-blue-100 text-blue-800'
    if (action.includes('deleted') || action.includes('deactivated')) return 'bg-red-100 text-red-800'
    if (action.includes('failed') || action.includes('error')) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  const clearFilters = () => {
    setFilters({
      action: '',
      resource_type: '',
      date_from: '',
      date_to: '',
      user_id: '',
      email: ''
    })
    setPagination(p => ({ ...p, page: 1 }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-blue-600 hover:text-blue-700">
                ← Back to Admin Panel
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => handleExport('csv')}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>CSV</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport('json')}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>JSON</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="action">Action</Label>
                <Select value={filters.action} onValueChange={(value) => 
                  setFilters(f => ({ ...f, action: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Actions</SelectItem>
                    <SelectItem value="user_login">User Login</SelectItem>
                    <SelectItem value="user_created">User Created</SelectItem>
                    <SelectItem value="user_updated">User Updated</SelectItem>
                    <SelectItem value="user_deactivated">User Deactivated</SelectItem>
                    <SelectItem value="booking_created">Booking Created</SelectItem>
                    <SelectItem value="booking_cancelled">Booking Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="resource_type">Resource Type</Label>
                <Select value={filters.resource_type} onValueChange={(value) => 
                  setFilters(f => ({ ...f, resource_type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Types</SelectItem>
                    <SelectItem value="auth">Authentication</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="classroom">Classroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date_from">Date From</Label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="date_to">Date To</Label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="search">Search User</Label>
                <Input
                  placeholder="User email..."
                  value={filters.email}
                  onChange={(e) => setFilters(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>System Activity ({pagination.total} entries)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Timestamp</th>
                        <th className="text-left p-3">User</th>
                        <th className="text-left p-3">Action</th>
                        <th className="text-left p-3">Resource</th>
                        <th className="text-left p-3">IP Address</th>
                        <th className="text-left p-3">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              <div className="font-medium">
                                {log.user?.name || 'System'}
                              </div>
                              <div className="text-gray-500">
                                {log.user?.email || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={getActionBadgeColor(log.action)}>
                              {log.action.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            <div>{log.resource_type}</div>
                            {log.resource_id && (
                              <div className="text-gray-500 text-xs">
                                {log.resource_id.substring(0, 8)}...
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            {log.ip_address || 'N/A'}
                          </td>
                          <td className="p-3">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Log Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Timestamp</Label>
                                      <p className="text-sm">{new Date(log.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label>Action</Label>
                                      <p className="text-sm">{log.action}</p>
                                    </div>
                                    <div>
                                      <Label>Resource Type</Label>
                                      <p className="text-sm">{log.resource_type}</p>
                                    </div>
                                    <div>
                                      <Label>IP Address</Label>
                                      <p className="text-sm">{log.ip_address || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>User</Label>
                                    <p className="text-sm">
                                      {log.user ? `${log.user.name} (${log.user.email})` : 'System'}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Details</Label>
                                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
