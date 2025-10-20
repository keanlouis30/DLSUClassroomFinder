-- Comprehensive fix for user creation issues

-- Step 1: Drop all existing INSERT policies on users table
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Allow user creation from auth trigger" ON users;

-- Step 2: Make id_number nullable
ALTER TABLE users ALTER COLUMN id_number DROP NOT NULL;

-- Step 3: Drop the unique constraint on id_number
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_number_key;

-- Step 4: Create a conditional unique index (only enforce uniqueness when id_number is not null)
DROP INDEX IF EXISTS users_id_number_unique_idx;
CREATE UNIQUE INDEX users_id_number_unique_idx ON users(id_number) 
WHERE id_number IS NOT NULL AND id_number != '';

-- Step 5: Create a more permissive trigger function that bypasses RLS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Extract name from metadata or email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert into users table (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO public.users (id, email, role, name, id_number)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    user_name,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    -- Still return NEW to not break authentication
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Create a single INSERT policy that allows both trigger and admin
CREATE POLICY "Allow user creation"
  ON users FOR INSERT
  WITH CHECK (
    -- Allow if no auth context (trigger execution)
    auth.uid() IS NULL 
    OR 
    -- Allow if user is admin
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Step 8: Ensure all other policies are in place
-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

