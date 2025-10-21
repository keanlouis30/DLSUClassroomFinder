-- Ensure kean_rosales@dlsu.edu.ph has admin role and proper status
-- This handles the case where the user already exists in the database

-- Update existing user to ensure admin role and active status
UPDATE users SET 
  role = 'admin',
  status = 'active',
  id_number = COALESCE(id_number, 'ADM001'),
  department = COALESCE(department, 'Computer Technology')
WHERE email = 'kean_rosales@dlsu.edu.ph';

-- Insert only if the user doesn't exist (fallback)
INSERT INTO users (
  id,
  email,
  role,
  name,
  id_number,
  department,
  status
) 
SELECT 
  gen_random_uuid(),
  'kean_rosales@dlsu.edu.ph',
  'admin',
  'Kean Rosales',
  'ADM001',
  'Computer Technology',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'kean_rosales@dlsu.edu.ph'
);

-- Function to automatically set admin role for kean_rosales@dlsu.edu.ph on login
CREATE OR REPLACE FUNCTION handle_admin_user()
RETURNS trigger AS $$
BEGIN
  -- Check if this is kean_rosales@dlsu.edu.ph
  IF NEW.email = 'kean_rosales@dlsu.edu.ph' THEN
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
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kean Rosales'),
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
