-- Rate limiting configuration
CREATE TABLE IF NOT EXISTS rate_limit_config (
  id INT PRIMARY KEY DEFAULT 1,
  max_failed_attempts INT DEFAULT 5,
  lockout_duration_minutes INT DEFAULT 30,
  reset_duration_hours INT DEFAULT 24,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default rate limiting config
INSERT INTO rate_limit_config (max_failed_attempts, lockout_duration_minutes, reset_duration_hours)
VALUES (5, 30, 24)
ON CONFLICT (id) DO NOTHING;

-- Function to check if account is rate limited
CREATE OR REPLACE FUNCTION is_account_rate_limited(user_email VARCHAR(255))
RETURNS TABLE (is_limited BOOLEAN, minutes_remaining INT) AS $$
DECLARE
  v_failed_count INT;
  v_last_failed_at TIMESTAMP;
  v_config_max_attempts INT;
  v_config_lockout_minutes INT;
  v_minutes_since_last_failed INT;
BEGIN
  -- Get current rate limiting config
  SELECT max_failed_attempts, lockout_duration_minutes 
  INTO v_config_max_attempts, v_config_lockout_minutes
  FROM rate_limit_config LIMIT 1;

  -- Get user's failed login attempts
  SELECT 
    COUNT(*) FILTER (WHERE success = false AND created_at > NOW() - INTERVAL '1 day'),
    MAX(created_at) FILTER (WHERE success = false)
  INTO v_failed_count, v_last_failed_at
  FROM login_attempts
  WHERE email = user_email;

  -- If no failed attempts, not limited
  IF v_failed_count IS NULL OR v_failed_count = 0 THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  -- If failed attempts exceed threshold and within lockout window, account is limited
  IF v_failed_count >= v_config_max_attempts THEN
    v_minutes_since_last_failed := EXTRACT(EPOCH FROM (NOW() - v_last_failed_at)) / 60;
    
    IF v_minutes_since_last_failed < v_config_lockout_minutes THEN
      RETURN QUERY SELECT true, (v_config_lockout_minutes - v_minutes_since_last_failed)::INT;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT false, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit by IP
CREATE OR REPLACE FUNCTION is_ip_rate_limited(client_ip INET)
RETURNS TABLE (is_limited BOOLEAN, minutes_remaining INT) AS $$
DECLARE
  v_failed_count INT;
  v_last_failed_at TIMESTAMP;
  v_config_lockout_minutes INT;
  v_minutes_since_last_failed INT;
BEGIN
  -- Get current rate limiting config
  SELECT lockout_duration_minutes
  INTO v_config_lockout_minutes
  FROM rate_limit_config LIMIT 1;

  -- Count failed attempts from this IP in last hour
  SELECT 
    COUNT(*),
    MAX(created_at)
  INTO v_failed_count, v_last_failed_at
  FROM login_attempts
  WHERE ip_address = client_ip AND success = false AND created_at > NOW() - INTERVAL '1 hour';

  -- If more than 10 failed attempts in an hour from same IP, limit it
  IF v_failed_count >= 10 THEN
    v_minutes_since_last_failed := EXTRACT(EPOCH FROM (NOW() - v_last_failed_at)) / 60;
    
    IF v_minutes_since_last_failed < v_config_lockout_minutes THEN
      RETURN QUERY SELECT true, (v_config_lockout_minutes - v_minutes_since_last_failed)::INT;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT false, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset failed login count for a user
CREATE OR REPLACE FUNCTION reset_failed_login_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    failed_login_count = 0,
    last_failed_login_at = NULL
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suspend account after too many failed attempts
CREATE OR REPLACE FUNCTION check_and_suspend_account(user_email VARCHAR(255), user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_config_max_attempts INT;
  v_is_limited BOOLEAN;
BEGIN
  SELECT max_failed_attempts INTO v_config_max_attempts FROM rate_limit_config LIMIT 1;
  
  SELECT is_limited FROM is_account_rate_limited(user_email) INTO v_is_limited;
  
  IF v_is_limited THEN
    -- Suspend the account temporarily
    UPDATE users 
    SET status = 'suspended'
    WHERE id = user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created ON login_attempts(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success_created ON login_attempts(success, created_at);

-- INSERT INTO login_attempts (email, success, ip_address, user_agent, domain_valid, created_at)
-- VALUES 
--   ('testlock@dlsu.edu.ph', false, '203.0.113.1'::inet, 'test', true, NOW() - INTERVAL '5 min'),
--   ('testlock@dlsu.edu.ph', false, '203.0.113.2'::inet, 'test', true, NOW() - INTERVAL '4 min'),
--   ('testlock@dlsu.edu.ph', false, '203.0.113.3'::inet, 'test', true, NOW() - INTERVAL '3 min'),
--   ('testlock@dlsu.edu.ph', false, '203.0.113.4'::inet, 'test', true, NOW() - INTERVAL '2 min'),
--   ('testlock@dlsu.edu.ph', false, '203.0.113.5'::inet, 'test', true, NOW());

-- -- Then verify:
-- SELECT * FROM is_account_rate_limited('testlock@dlsu.edu.ph');
-- -- Should return: is_limited = true, minutes_remaining = 29-30