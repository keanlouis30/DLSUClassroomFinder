-- Heat Map Functions for Real-time Occupancy Tracking

-- Function to check if a classroom is currently occupied based on bookings and schedules
CREATE OR REPLACE FUNCTION is_classroom_occupied(
  classroom_uuid UUID,
  check_datetime TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  check_date DATE;
  check_time TIME;
  check_day_of_week INTEGER;
BEGIN
  check_date := check_datetime::DATE;
  check_time := check_datetime::TIME;
  check_day_of_week := EXTRACT(DOW FROM check_datetime)::INTEGER;
  
  -- Check if there's an active booking
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE classroom_id = classroom_uuid
    AND booking_date = check_date
    AND start_time <= check_time
    AND end_time > check_time
    AND status IN ('confirmed', 'checked_in')
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if there's a scheduled class
  IF EXISTS (
    SELECT 1 FROM class_schedules
    WHERE classroom_id = classroom_uuid
    AND check_date BETWEEN start_date AND end_date
    AND check_day_of_week = ANY(days_of_week)
    AND start_time <= check_time
    AND end_time > check_time
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get detailed classroom status including next available time
CREATE OR REPLACE FUNCTION get_classroom_status(
  classroom_uuid UUID,
  check_datetime TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  is_occupied BOOLEAN,
  current_status VARCHAR,
  occupied_until TIME,
  next_available_at TIME
) AS $$
DECLARE
  check_date DATE;
  check_time TIME;
  check_day_of_week INTEGER;
  next_booking_start TIME;
  current_booking_end TIME;
BEGIN
  check_date := check_datetime::DATE;
  check_time := check_datetime::TIME;
  check_day_of_week := EXTRACT(DOW FROM check_datetime)::INTEGER;
  
  -- Get the classroom's maintenance/reserved status
  SELECT c.current_status INTO current_status
  FROM classrooms c
  WHERE c.id = classroom_uuid;
  
  -- If in maintenance or reserved, return early
  IF current_status IN ('maintenance', 'reserved') THEN
    is_occupied := TRUE;
    occupied_until := '23:59:59'::TIME;
    next_available_at := NULL;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check for active booking
  SELECT b.end_time INTO current_booking_end
  FROM bookings b
  WHERE b.classroom_id = classroom_uuid
  AND b.booking_date = check_date
  AND b.start_time <= check_time
  AND b.end_time > check_time
  AND b.status IN ('confirmed', 'checked_in')
  ORDER BY b.end_time DESC
  LIMIT 1;
  
  -- If no active booking, check for scheduled class
  IF current_booking_end IS NULL THEN
    SELECT cs.end_time INTO current_booking_end
    FROM class_schedules cs
    WHERE cs.classroom_id = classroom_uuid
    AND check_date BETWEEN cs.start_date AND cs.end_date
    AND check_day_of_week = ANY(cs.days_of_week)
    AND cs.start_time <= check_time
    AND cs.end_time > check_time
    ORDER BY cs.end_time DESC
    LIMIT 1;
  END IF;
  
  -- Set occupation status
  is_occupied := (current_booking_end IS NOT NULL);
  occupied_until := current_booking_end;
  
  -- Find next booking/class after current time
  SELECT MIN(start_time) INTO next_booking_start
  FROM (
    SELECT b.start_time
    FROM bookings b
    WHERE b.classroom_id = classroom_uuid
    AND b.booking_date = check_date
    AND b.start_time > COALESCE(current_booking_end, check_time)
    AND b.status IN ('pending', 'confirmed', 'checked_in')
    
    UNION
    
    SELECT cs.start_time
    FROM class_schedules cs
    WHERE cs.classroom_id = classroom_uuid
    AND check_date BETWEEN cs.start_date AND cs.end_date
    AND check_day_of_week = ANY(cs.days_of_week)
    AND cs.start_time > COALESCE(current_booking_end, check_time)
  ) next_events;
  
  next_available_at := next_booking_start;
  
  -- Update current_status based on occupation
  IF is_occupied THEN
    current_status := 'occupied';
  ELSE
    current_status := 'available';
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get building occupancy statistics
CREATE OR REPLACE FUNCTION get_building_occupancy(
  target_datetime TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  code VARCHAR(10),
  total_classrooms BIGINT,
  occupied_count BIGINT,
  available_count BIGINT,
  maintenance_count BIGINT,
  occupancy_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.code,
    COUNT(c.id) as total_classrooms,
    COUNT(c.id) FILTER (
      WHERE is_classroom_occupied(c.id, target_datetime) 
      OR c.current_status IN ('occupied', 'reserved')
    ) as occupied_count,
    COUNT(c.id) FILTER (
      WHERE NOT is_classroom_occupied(c.id, target_datetime) 
      AND c.current_status = 'available'
    ) as available_count,
    COUNT(c.id) FILTER (
      WHERE c.current_status = 'maintenance'
    ) as maintenance_count,
    ROUND(
      COUNT(c.id) FILTER (
        WHERE is_classroom_occupied(c.id, target_datetime) 
        OR c.current_status IN ('occupied', 'reserved')
      )::NUMERIC / 
      NULLIF(COUNT(c.id), 0),
      2
    ) as occupancy_rate
  FROM buildings b
  LEFT JOIN classrooms c ON c.building_id = b.id
  GROUP BY b.id, b.name, b.code
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get floor occupancy for a specific building
CREATE OR REPLACE FUNCTION get_floor_occupancy(
  building_uuid UUID,
  target_datetime TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  floor INTEGER,
  total_classrooms BIGINT,
  occupied_count BIGINT,
  available_count BIGINT,
  occupancy_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.floor,
    COUNT(c.id) as total_classrooms,
    COUNT(c.id) FILTER (
      WHERE is_classroom_occupied(c.id, target_datetime) 
      OR c.current_status IN ('occupied', 'reserved')
    ) as occupied_count,
    COUNT(c.id) FILTER (
      WHERE NOT is_classroom_occupied(c.id, target_datetime) 
      AND c.current_status = 'available'
    ) as available_count,
    ROUND(
      COUNT(c.id) FILTER (
        WHERE is_classroom_occupied(c.id, target_datetime) 
        OR c.current_status IN ('occupied', 'reserved')
      )::NUMERIC / 
      NULLIF(COUNT(c.id), 0),
      2
    ) as occupancy_rate
  FROM classrooms c
  WHERE c.building_id = building_uuid
  GROUP BY c.floor
  ORDER BY c.floor;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get classroom details with status for a building and floor
CREATE OR REPLACE FUNCTION get_classrooms_with_status(
  building_uuid UUID,
  floor_number INTEGER,
  target_datetime TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id UUID,
  room_number VARCHAR(20),
  floor INTEGER,
  capacity INTEGER,
  amenities JSONB,
  is_occupied BOOLEAN,
  status VARCHAR(20),
  occupied_until TIME,
  next_available_at TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.room_number,
    c.floor,
    c.capacity,
    c.amenities,
    s.is_occupied,
    s.current_status,
    s.occupied_until,
    s.next_available_at
  FROM classrooms c
  CROSS JOIN LATERAL get_classroom_status(c.id, target_datetime) s
  WHERE c.building_id = building_uuid
  AND c.floor = floor_number
  ORDER BY c.room_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get classroom schedule for the day
CREATE OR REPLACE FUNCTION get_classroom_schedule(
  classroom_uuid UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  event_type VARCHAR(20),
  start_time TIME,
  end_time TIME,
  title TEXT,
  status VARCHAR(20),
  user_name VARCHAR(255)
) AS $$
DECLARE
  day_of_week INTEGER;
BEGIN
  day_of_week := EXTRACT(DOW FROM target_date)::INTEGER;
  
  RETURN QUERY
  -- Get bookings for the day
  SELECT 
    'booking'::VARCHAR(20) as event_type,
    b.start_time,
    b.end_time,
    'Student Booking'::TEXT as title,
    b.status,
    u.name as user_name
  FROM bookings b
  JOIN users u ON u.id = b.user_id
  WHERE b.classroom_id = classroom_uuid
  AND b.booking_date = target_date
  AND b.status NOT IN ('cancelled', 'auto_cancelled')
  
  UNION ALL
  
  -- Get scheduled classes for the day
  SELECT 
    'class'::VARCHAR(20) as event_type,
    cs.start_time,
    cs.end_time,
    cs.course_code || ' - ' || COALESCE(cs.instructor, 'TBA') as title,
    'scheduled'::VARCHAR(20) as status,
    cs.instructor as user_name
  FROM class_schedules cs
  WHERE cs.classroom_id = classroom_uuid
  AND target_date BETWEEN cs.start_date AND cs.end_date
  AND day_of_week = ANY(cs.days_of_week)
  
  ORDER BY start_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_bookings_datetime 
  ON bookings(booking_date, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_class_schedules_datetime 
  ON class_schedules(start_date, end_date, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_classrooms_floor 
  ON classrooms(building_id, floor);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_classroom_occupied TO authenticated;
GRANT EXECUTE ON FUNCTION get_classroom_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_building_occupancy TO authenticated;
GRANT EXECUTE ON FUNCTION get_floor_occupancy TO authenticated;
GRANT EXECUTE ON FUNCTION get_classrooms_with_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_classroom_schedule TO authenticated;

