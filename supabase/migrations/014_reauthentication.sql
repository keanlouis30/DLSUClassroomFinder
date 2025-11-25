-- Add re-authentication tracking for critical admin operations
CREATE TABLE IF NOT EXISTS admin_reauth_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_name VARCHAR(255) NOT NULL,
  action_details JSONB,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed', 'cancelled')),
  ip_address INET,
  user_agent TEXT,
  verified_at TIMESTAMP,
  failed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_admin_reauth_user_id ON admin_reauth_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_reauth_action ON admin_reauth_logs(action_name);
CREATE INDEX IF NOT EXISTS idx_admin_reauth_status ON admin_reauth_logs(status);

-- Enable RLS
ALTER TABLE admin_reauth_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view re-auth logs
CREATE POLICY "Admins can view all reauth logs"
  ON admin_reauth_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

-- Function to log re-authentication attempts
CREATE OR REPLACE FUNCTION log_reauth_attempt(
  user_id UUID,
  action_name VARCHAR(255),
  reauth_status VARCHAR(20),
  client_ip INET DEFAULT NULL,
  client_user_agent TEXT DEFAULT NULL,
  action_details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_reauth_logs (
    user_id,
    action_name,
    status,
    ip_address,
    user_agent,
    action_details,
    verified_at
  ) VALUES (
    user_id,
    action_name,
    reauth_status,
    client_ip,
    client_user_agent,
    action_details,
    CASE WHEN reauth_status = 'verified' THEN NOW() ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has recent re-auth for a specific action
CREATE OR REPLACE FUNCTION has_recent_reauth(
  user_id UUID,
  action_name VARCHAR(255),
  within_minutes INT DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_reauth TIMESTAMP;
BEGIN
  SELECT verified_at
  INTO recent_reauth
  FROM admin_reauth_logs
  WHERE 
    admin_reauth_logs.user_id = has_recent_reauth.user_id
    AND admin_reauth_logs.action_name = has_recent_reauth.action_name
    AND status = 'verified'
    AND verified_at > NOW() - (within_minutes || ' minutes')::INTERVAL
  ORDER BY verified_at DESC
  LIMIT 1;

  RETURN recent_reauth IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update audit_logs to include re-authentication status
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS requires_reauth BOOLEAN DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reauth_verified BOOLEAN DEFAULT false;
