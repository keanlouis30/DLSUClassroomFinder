-- Ensure john_dionel_capacio@dlsu.edu.ph has admin role and proper status
-- This migration only updates users that already exist in auth.users table
-- It will NOT create new users with random IDs (which causes foreign key errors)

-- Function to automatically set admin role for john_dionel_capacio@dlsu.edu.ph on login
CREATE OR REPLACE FUNCTION handle_admin_user()
RETURNS trigger AS $$
BEGIN
  -- Check if this is john_dionel_capacio@dlsu.edu.ph
  IF NEW.email = 'john_dionel_capacio@dlsu.edu.ph' THEN
    -- Update or insert into users table with admin role
    INSERT INTO public.users (
      id,
      email,
      role,
      name,
      id_number,
      department,
      status
    ) VALUES (
      NEW.id,
      NEW.email,
      'admin',
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'John Capacio'),
      'ADM001',
      'Computer Technology',
      'active'
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      email = NEW.email,
      status = 'active',
      name = COALESCE(NEW.raw_user_meta_data->>'full_name', users.name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle admin user on auth.users insert/update
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_admin_user();

-- If the user already exists in the users table, ensure they have admin role
UPDATE users SET 
  role = 'admin',
  status = 'active',
  id_number = COALESCE(id_number, 'ADM001'),
  department = COALESCE(department, 'Computer Technology')
WHERE email = 'john_dionel_capacio@dlsu.edu.ph';
