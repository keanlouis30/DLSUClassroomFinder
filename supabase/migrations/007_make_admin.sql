-- Make your account an admin
-- Replace YOUR_EMAIL with your actual @dlsu.edu.ph email

-- Update user role to admin
UPDATE users 
SET role = 'admin'
WHERE email = 'YOUR_EMAIL@dlsu.edu.ph';

-- Verify the change
SELECT id, email, name, role 
FROM users 
WHERE email = 'YOUR_EMAIL@dlsu.edu.ph';

-- If you need to find your email first, uncomment this:
-- SELECT id, email, name, role FROM users;

