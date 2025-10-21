import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: List audit logs with pagination and filtering
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const action = searchParams.get('action');
  const userId = searchParams.get('user_id');
  const resourceType = searchParams.get('resource_type');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const export_format = searchParams.get('export');

  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      user:users(name, email, role)
    `, { count: 'exact' })
    .order('timestamp', { ascending: false });

  // Apply filters
  if (action) {
    query = query.eq('action', action);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }
  if (dateFrom) {
    query = query.gte('timestamp', dateFrom);
  }
  if (dateTo) {
    query = query.lte('timestamp', dateTo);
  }

  if (export_format) {
    // For export, get all matching records (up to a reasonable limit)
    const { data: logs, error } = await query.limit(10000);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (export_format === 'csv') {
      const csvContent = convertToCSV(logs);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit_logs.csv"'
        }
      });
    }

    if (export_format === 'json') {
      return new NextResponse(JSON.stringify(logs, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="audit_logs.json"'
        }
      });
    }
  }

  // Regular paginated response
  const { data: logs, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
}

function convertToCSV(data: any[]): string {
  if (!data.length) return '';

  const headers = [
    'Timestamp',
    'User Email',
    'User Name', 
    'Action',
    'Resource Type',
    'Resource ID',
    'IP Address',
    'Details'
  ];

  const csvRows = [
    headers.join(','),
    ...data.map(log => [
      new Date(log.timestamp).toISOString(),
      log.user?.email || 'N/A',
      log.user?.name || 'N/A',
      log.action,
      log.resource_type,
      log.resource_id || 'N/A',
      log.ip_address || 'N/A',
      JSON.stringify(log.details || {}).replace(/"/g, '""')
    ].map(field => `"${field}"`).join(','))
  ];

  return csvRows.join('\n');
}
