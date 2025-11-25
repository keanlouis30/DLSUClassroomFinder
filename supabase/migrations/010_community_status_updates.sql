-- Community-Driven Classroom Status Updates
-- Students can report real-time classroom occupancy with verification system

-- Create table for community status reports
CREATE TABLE IF NOT EXISTS classroom_status_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status information
  reported_status VARCHAR(20) NOT NULL 
    CHECK (reported_status IN ('occupied', 'available', 'maintenance')),
  report_type VARCHAR(20) NOT NULL
    CHECK (report_type IN ('class_in_session', 'exam', 'event', 'empty', 'maintenance_issue')),
  
  -- Additional context
  details TEXT,
  estimated_occupancy INTEGER CHECK (estimated_occupancy BETWEEN 0 AND 100),
  expected_end_time TIME,
  
  -- Verification system
  verification_count INTEGER DEFAULT 0,
  contradiction_count INTEGER DEFAULT 0,
  confidence_score NUMERIC DEFAULT 0.5,
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent spam: one report per user per classroom per 15 minutes
  CONSTRAINT unique_recent_report UNIQUE (classroom_id, reported_by, created_at)
);

-- Create table for report verifications
CREATE TABLE IF NOT EXISTS status_report_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES classroom_status_reports(id) ON DELETE CASCADE,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  verification_type VARCHAR(20) NOT NULL
    CHECK (verification_type IN ('confirm', 'contradict')),
  
  -- Optional evidence
  photo_url TEXT,
  comment TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate verifications
  CONSTRAINT unique_user_verification UNIQUE (report_id, verified_by)
);

-- Create view for current classroom status (community consensus)
CREATE OR REPLACE VIEW classroom_live_status AS
SELECT 
  c.id as classroom_id,
  c.building_id,
  c.room_number,
  c.current_status as official_status,
  
  -- Get most recent high-confidence report
  (
    SELECT reported_status 
    FROM classroom_status_reports csr
    WHERE csr.classroom_id = c.id
    AND csr.expires_at > NOW()
    AND csr.confidence_score >= 0.6
    ORDER BY csr.created_at DESC
    LIMIT 1
  ) as community_status,
  
  -- Report details
  (
    SELECT details
    FROM classroom_status_reports csr
    WHERE csr.classroom_id = c.id
    AND csr.expires_at > NOW()
    ORDER BY csr.created_at DESC
    LIMIT 1
  ) as status_details,
  
  -- Confidence metrics
  (
    SELECT confidence_score
    FROM classroom_status_reports csr
    WHERE csr.classroom_id = c.id
    AND csr.expires_at > NOW()
    ORDER BY csr.created_at DESC
    LIMIT 1
  ) as confidence,
  
  (
    SELECT verification_count
    FROM classroom_status_reports csr
    WHERE csr.classroom_id = c.id
    AND csr.expires_at > NOW()
    ORDER BY csr.created_at DESC
    LIMIT 1
  ) as verifications,
  
  (
    SELECT created_at
    FROM classroom_status_reports csr
    WHERE csr.classroom_id = c.id
    AND csr.expires_at > NOW()
    ORDER BY csr.created_at DESC
    LIMIT 1
  ) as last_reported
  
FROM classrooms c;

-- Function to update confidence score based on verifications
CREATE OR REPLACE FUNCTION update_report_confidence()
RETURNS TRIGGER AS $$
DECLARE
  total_verifications INTEGER;
  confirm_count INTEGER;
  new_confidence NUMERIC;
BEGIN
  -- Count verifications
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE verification_type = 'confirm')
  INTO total_verifications, confirm_count
  FROM status_report_verifications
  WHERE report_id = NEW.report_id;
  
  -- Calculate confidence score
  IF total_verifications > 0 THEN
    new_confidence := confirm_count::NUMERIC / total_verifications;
    
    -- Boost confidence with more verifications
    IF total_verifications >= 3 THEN
      new_confidence := LEAST(new_confidence + 0.2, 1.0);
    END IF;
    
    -- Mark as verified if high confidence
    UPDATE classroom_status_reports
    SET 
      verification_count = confirm_count,
      contradiction_count = total_verifications - confirm_count,
      confidence_score = new_confidence,
      is_verified = (new_confidence >= 0.7 AND total_verifications >= 2),
      updated_at = NOW()
    WHERE id = NEW.report_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update confidence after verification
CREATE TRIGGER update_confidence_on_verification
  AFTER INSERT ON status_report_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_report_confidence();

-- Function to auto-expire old reports
CREATE OR REPLACE FUNCTION auto_expire_reports()
RETURNS void AS $$
BEGIN
  -- Mark reports as expired if past expiration time
  UPDATE classroom_status_reports
  SET confidence_score = 0
  WHERE expires_at < NOW() AND confidence_score > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to detect and flag suspicious activity
CREATE OR REPLACE FUNCTION detect_spam_reports(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  recent_reports INTEGER;
  contradiction_rate NUMERIC;
BEGIN
  -- Check for spam (too many reports in short time)
  SELECT COUNT(*)
  INTO recent_reports
  FROM classroom_status_reports
  WHERE reported_by = user_uuid
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF recent_reports > 10 THEN
    RETURN TRUE; -- Likely spam
  END IF;
  
  -- Check contradiction rate (reports often contradicted)
  SELECT 
    AVG(contradiction_count::NUMERIC / NULLIF(verification_count + contradiction_count, 0))
  INTO contradiction_rate
  FROM classroom_status_reports
  WHERE reported_by = user_uuid
  AND created_at > NOW() - INTERVAL '7 days';
  
  IF contradiction_rate > 0.7 THEN
    RETURN TRUE; -- Likely unreliable reporter
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_status_reports_classroom ON classroom_status_reports(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_reports_expires ON classroom_status_reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_status_reports_confidence ON classroom_status_reports(confidence_score);
CREATE INDEX IF NOT EXISTS idx_verifications_report ON status_report_verifications(report_id);

-- Enable RLS
ALTER TABLE classroom_status_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_report_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view status reports"
  ON classroom_status_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create status reports"
  ON classroom_status_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Anyone can view verifications"
  ON status_report_verifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can verify reports"
  ON status_report_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = verified_by);

-- Grant permissions
GRANT SELECT ON classroom_live_status TO authenticated;
GRANT ALL ON classroom_status_reports TO authenticated;
GRANT ALL ON status_report_verifications TO authenticated;

-- Add audit log for status reports
CREATE OR REPLACE FUNCTION log_status_report()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    NEW.reported_by,
    'status_report_created',
    'classroom_status_report',
    NEW.id,
    jsonb_build_object(
      'classroom_id', NEW.classroom_id,
      'reported_status', NEW.reported_status,
      'report_type', NEW.report_type
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_status_report_trigger
  AFTER INSERT ON classroom_status_reports
  FOR EACH ROW
  EXECUTE FUNCTION log_status_report();

