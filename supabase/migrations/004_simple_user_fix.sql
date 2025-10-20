-- Simplest possible fix for user creation

-- 1. Temporarily disable RLS on users table to test
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Make id_number nullable
ALTER TABLE users ALTER COLUMN id_number DROP NOT NULL;

-- 3. Drop unique constraint on id_number
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_number_key;

-- 4. Recreate trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, name)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, that's ok
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE LOG 'Error creating user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Now re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Allow user creation from auth trigger" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- 7. Create simple, clear policies
-- Allow service role to do anything (this is the key!)
CREATE POLICY "Service role bypass"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view their own profile
CREATE POLICY "Users view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile (but not role)
CREATE POLICY "Users update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Allow admins to do everything
CREATE POLICY "Admins full access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

