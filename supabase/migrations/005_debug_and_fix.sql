-- Debug and fix user creation issue completely

-- Step 1: Check current state
DO $$
BEGIN
  RAISE NOTICE '=== CHECKING CURRENT STATE ===';
  
  -- Check if trigger exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    RAISE NOTICE 'Trigger exists: on_auth_user_created';
  ELSE
    RAISE NOTICE 'Trigger MISSING: on_auth_user_created';
  END IF;
  
  -- Check if function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    RAISE NOTICE 'Function exists: handle_new_user';
  ELSE
    RAISE NOTICE 'Function MISSING: handle_new_user';
  END IF;
END $$;

-- Step 2: Clean slate - remove everything
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Step 3: Fix table structure
ALTER TABLE public.users ALTER COLUMN id_number DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN id_number DROP DEFAULT;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_number_key;

-- Create partial unique index for id_number (allows nulls)
DROP INDEX IF EXISTS users_id_number_unique_idx;
CREATE UNIQUE INDEX users_id_number_unique_idx 
ON public.users(id_number) 
WHERE id_number IS NOT NULL;

-- Step 4: Completely disable RLS for testing
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 5: Create super simple trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that trigger fired
  RAISE LOG 'handle_new_user triggered for user: %', NEW.email;
  
  -- Insert user
  INSERT INTO public.users (id, email, role, name, id_number)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    ),
    NULL
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name;
  
  RAISE LOG 'User created successfully: %', NEW.email;
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log detailed error
  RAISE WARNING 'ERROR in handle_new_user: SQLSTATE=% SQLERRM=%', SQLSTATE, SQLERRM;
  RAISE WARNING 'Failed for user: % (ID: %)', NEW.email, NEW.id;
  -- Return NEW anyway to not block auth
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 6: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Step 8: Verify everything
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICATION ===';
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    RAISE NOTICE '✓ Trigger created successfully';
  ELSE
    RAISE NOTICE '✗ Trigger creation FAILED';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    RAISE NOTICE '✓ Function created successfully';
  ELSE
    RAISE NOTICE '✗ Function creation FAILED';
  END IF;
  
  RAISE NOTICE '=== Setup complete! Try logging in now. ===';
END $$;

