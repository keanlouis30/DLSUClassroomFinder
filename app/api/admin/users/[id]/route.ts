import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  role: z.enum(['user', 'manager', 'admin']).optional(),
  name: z.string().min(1).max(255).optional(),
  id_number: z.string().min(1).max(50).optional(),
  department: z.string().optional(),
  assigned_buildings: z.array(z.string().uuid()).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
});

// GET: Get single user details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const { data: targetUser, error } = await supabase
    .from('users')
    .select(`
      *,
      buildings:assigned_buildings(id, name, code)
    `)
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(targetUser);
}

// PUT: Update user
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const validated = UpdateUserSchema.parse(body);

    // Get current user data for audit log
    const { data: currentUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'user_updated',
      resource_type: 'user',
      resource_id: params.id,
      details: {
        updated_user_email: currentUser.email,
        changes: validated,
        previous_values: {
          role: currentUser.role,
          status: currentUser.status,
          name: currentUser.name
        }
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Deactivate user (don't actually delete, just set status to inactive)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  // Prevent self-deletion
  if (params.id === user.id) {
    return NextResponse.json(
      { error: 'Cannot deactivate your own account' },
      { status: 400 }
    );
  }

  // Get user data for audit log
  const { data: targetUser } = await supabase
    .from('users')
    .select('email, role')
    .eq('id', params.id)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Deactivate user instead of deleting
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'user_deactivated',
    resource_type: 'user',
    resource_id: params.id,
    details: {
      deactivated_user_email: targetUser.email,
      deactivated_user_role: targetUser.role
    }
  });

  return NextResponse.json({ message: 'User deactivated successfully' });
}
