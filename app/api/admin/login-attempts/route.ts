import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: List login attempts with pagination and filtering
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
  const success = searchParams.get('success');
  const email = searchParams.get('email');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const domainValid = searchParams.get('domain_valid');
  const export_format = searchParams.get('export');

  const offset = (page - 1) * limit;

  let query = supabase
    .from('login_attempts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply filters
  if (success !== null) {
    query = query.eq('success', success === 'true');
  }
  if (email) {
    query = query.ilike('email', `%${email}%`);
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }
  if (domainValid !== null) {
    query = query.eq('domain_valid', domainValid === 'true');
  }

  if (export_format) {
    // For export, get all matching records (up to a reasonable limit)
    const { data: attempts, error } = await query.limit(10000);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (export_format === 'csv') {
      const csvContent = convertToCSV(attempts);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="login_attempts.csv"'
        }
      });
    }

    if (export_format === 'json') {
      return new NextResponse(JSON.stringify(attempts, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="login_attempts.json"'
        }
      });
    }
  }

  // Regular paginated response
  const { data: attempts, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    attempts,
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
    'Email',
    'Success',
    'Domain Valid',
    'IP Address',
    'User Agent',
    'Error Message'
  ];

  const csvRows = [
    headers.join(','),
    ...data.map(attempt => [
      new Date(attempt.created_at).toISOString(),
      attempt.email,
      attempt.success ? 'Yes' : 'No',
      attempt.domain_valid ? 'Yes' : 'No',
      attempt.ip_address || 'N/A',
      (attempt.user_agent || '').replace(/"/g, '""'),
      (attempt.error_message || '').replace(/"/g, '""')
    ].map(field => `"${field}"`).join(','))
  ];

  return csvRows.join('\n');
}
