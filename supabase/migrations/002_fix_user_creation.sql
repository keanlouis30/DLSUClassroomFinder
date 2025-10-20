-- Fix user creation issues

-- 1. Make id_number nullable and remove unique constraint temporarily
ALTER TABLE users ALTER COLUMN id_number DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_number_key;

-- 2. Add a unique constraint that allows NULLs (only enforces uniqueness on non-null values)
CREATE UNIQUE INDEX users_id_number_unique_idx ON users(id_number) WHERE id_number IS NOT NULL AND id_number != '';

-- 3. Update the trigger function to handle null id_number
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, role, name, id_number)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'id_number', ''), '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add a policy to allow the trigger function to insert users
CREATE POLICY "Allow user creation from auth trigger"
  ON users FOR INSERT
  WITH CHECK (true);

-- 5. Update users policy ordering (drop and recreate to ensure proper order)
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- Recreate admin policy
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

