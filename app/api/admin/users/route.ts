import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().refine(email => email.endsWith('@dlsu.edu.ph'), {
    message: 'Email must be from @dlsu.edu.ph domain'
  }),
  role: z.enum(['user', 'manager', 'admin']),
  name: z.string().min(1).max(255),
  id_number: z.string().min(1).max(50),
  department: z.string().optional(),
  assigned_buildings: z.array(z.string().uuid()).optional()
});

const UpdateUserSchema = z.object({
  role: z.enum(['user', 'manager', 'admin']).optional(),
  name: z.string().min(1).max(255).optional(),
  id_number: z.string().min(1).max(50).optional(),
  department: z.string().optional(),
  assigned_buildings: z.array(z.string().uuid()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

// GET: List all users with pagination and filtering
export async function GET(request: Request) {
  try {
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        role,
        name,
        id_number,
        department,
        status,
        last_login_at,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role) {
      query = query.eq('role', role);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,id_number.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('[GET /api/admin/users] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('[GET /api/admin/users] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new user
export async function POST(request: Request) {
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

  try {
    const body = await request.json();
    console.log('[POST /api/admin/users] Request body:', body);
    
    const validated = CreateUserSchema.parse(body);
    console.log('[POST /api/admin/users] Validated:', validated);

    // Check if email already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', validated.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Try to create the user profile
    // The user must exist in auth.users with this email (they need to have logged in via OAuth first)
    // If they don't exist in auth.users, the foreign key constraint will fail
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: validated.email,
        role: validated.role,
        name: validated.name,
        id_number: validated.id_number,
        department: validated.department,
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('[POST /api/admin/users] Create error:', createError);
      
      // Check if it's a NOT NULL constraint on id (user doesn't exist in auth.users)
      if (createError.code === '23502' && createError.message.includes('id')) {
        return NextResponse.json(
          { error: 'Cannot pre-create users. Users must log in via OAuth (Google) first with their @dlsu.edu.ph account. After they log in, their profile will be created and you can update their role and department.' },
          { status: 400 }
        );
      }
      
      // Check if it's a foreign key error (shouldn't happen with above check, but just in case)
      if (createError.code === '23503') {
        return NextResponse.json(
          { error: 'User must log in via OAuth (Google) first before creating a profile.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    console.log('[POST /api/admin/users] User created:', newUser.id);

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'user_created',
      resource_type: 'user',
      resource_id: newUser.id,
      details: {
        created_user_email: validated.email,
        created_user_role: validated.role
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/users] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
