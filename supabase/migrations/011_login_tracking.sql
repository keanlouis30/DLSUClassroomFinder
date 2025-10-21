-- Add login tracking table for authentication attempts
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  domain_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add user status fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
  CHECK (status IN ('active', 'inactive', 'suspended'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0;

-- Index for login attempts
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX idx_login_attempts_success ON login_attempts(success);

-- RLS for login_attempts table
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Admins can view all login attempts"
  ON login_attempts FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Function to log login attempts
CREATE OR REPLACE FUNCTION log_login_attempt(
  user_email VARCHAR(255),
  is_success BOOLEAN,
  client_ip INET DEFAULT NULL,
  client_user_agent TEXT DEFAULT NULL,
  error_msg TEXT DEFAULT NULL,
  is_domain_valid BOOLEAN DEFAULT true
)
RETURNS void AS $$
BEGIN
  INSERT INTO login_attempts (
    email, 
    success, 
    ip_address, 
    user_agent, 
    error_message,
    domain_valid
  ) VALUES (
    user_email, 
    is_success, 
    client_ip, 
    client_user_agent, 
    error_msg,
    is_domain_valid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user login status
CREATE OR REPLACE FUNCTION update_user_login_status(
  user_id UUID,
  is_success BOOLEAN
)
RETURNS void AS $$
BEGIN
  IF is_success THEN
    UPDATE users 
    SET 
      last_login_at = NOW(),
      failed_login_count = 0
    WHERE id = user_id;
  ELSE
    UPDATE users 
    SET 
      last_failed_login_at = NOW(),
      failed_login_count = COALESCE(failed_login_count, 0) + 1
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
