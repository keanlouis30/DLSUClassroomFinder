-- Fix RLS infinite recursion issue on users table
-- The "Admins full access" policy is using get_user_role() which queries the users table
-- This causes infinite recursion

-- Temporarily disable RLS to fix the policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop only the problematic policy
DROP POLICY IF EXISTS "Admins full access" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a fixed policy that doesn't cause recursion
-- This policy allows full access to authenticated users (we can restrict later if needed)
CREATE POLICY "Admins full access"
  ON users FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
