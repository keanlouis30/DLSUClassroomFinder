-- Add booking purpose field to enforce classroom sharing policy
-- This ensures students book classrooms for valid academic purposes only

-- Add purpose field to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS purpose VARCHAR(50),
ADD COLUMN IF NOT EXISTS purpose_details TEXT,
ADD COLUMN IF NOT EXISTS estimated_attendees INTEGER DEFAULT 1;

-- Add constraint to ensure purpose is provided
ALTER TABLE bookings 
ADD CONSTRAINT valid_booking_purpose 
CHECK (purpose IN (
  'group_study',      -- Group study session (2+ students)
  'project_meeting',  -- Project collaboration
  'review_session',   -- Exam review/study group
  'org_activity',     -- Student organization activity
  'presentation_prep', -- Group presentation practice
  'tutoring',         -- Peer tutoring session
  'workshop'          -- Student-led workshop
));

-- Add constraint for minimum attendees (enforce sharing)
ALTER TABLE bookings 
ADD CONSTRAINT minimum_attendees 
CHECK (estimated_attendees >= 2);

-- Create index for reporting purposes
CREATE INDEX IF NOT EXISTS idx_bookings_purpose ON bookings(purpose);

-- Add comments for documentation
COMMENT ON COLUMN bookings.purpose IS 'Required: Valid academic purpose for booking. Solo studying should use library.';
COMMENT ON COLUMN bookings.purpose_details IS 'Optional: Additional details about the booking purpose (subject, project name, etc.)';
COMMENT ON COLUMN bookings.estimated_attendees IS 'Required: Minimum 2 people to enforce classroom sharing policy';

-- Create view for booking analytics with purposes
CREATE OR REPLACE VIEW booking_analytics AS
SELECT 
  purpose,
  COUNT(*) as total_bookings,
  AVG(estimated_attendees) as avg_attendees,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings
FROM bookings
WHERE purpose IS NOT NULL
GROUP BY purpose;

-- Grant permissions
GRANT SELECT ON booking_analytics TO authenticated;

