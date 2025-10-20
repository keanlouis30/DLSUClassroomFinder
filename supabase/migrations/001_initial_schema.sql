-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'manager', 'admin')) DEFAULT 'user',
  name VARCHAR(255) NOT NULL,
  id_number VARCHAR(50) UNIQUE NOT NULL,
  department VARCHAR(100),
  assigned_buildings UUID[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Buildings table
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  floors INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Classrooms table
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  floor INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  amenities JSONB DEFAULT '[]',
  current_status VARCHAR(20) DEFAULT 'available'
    CHECK (current_status IN ('available', 'occupied', 'maintenance', 'reserved')),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(building_id, room_number)
);

-- Class schedules table (recurring)
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  course_code VARCHAR(20) NOT NULL,
  instructor VARCHAR(255),
  days_of_week INTEGER[] NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'auto_cancelled')),
  checked_in_at TIMESTAMP,
  checked_out_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  issue_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_classroom_id ON bookings(classroom_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_classrooms_building_id ON classrooms(building_id);
CREATE INDEX idx_class_schedules_classroom_id ON class_schedules(classroom_id);
CREATE INDEX idx_reports_classroom_id ON reports(classroom_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR AS $$
  SELECT role FROM users WHERE id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check if user is manager of building
CREATE OR REPLACE FUNCTION is_manager_of_building(user_uuid UUID, building_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_uuid 
    AND role = 'manager' 
    AND building_uuid = ANY(assigned_buildings)
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for buildings table
CREATE POLICY "Everyone can view buildings"
  ON buildings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage buildings"
  ON buildings FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for classrooms table
CREATE POLICY "Everyone can view classrooms"
  ON classrooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can update their building classrooms"
  ON classrooms FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'manager' 
    AND is_manager_of_building(auth.uid(), building_id)
  );

CREATE POLICY "Admins can manage all classrooms"
  ON classrooms FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for class_schedules table
CREATE POLICY "Everyone can view schedules"
  ON class_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can manage schedules in their buildings"
  ON class_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = class_schedules.classroom_id
      AND is_manager_of_building(auth.uid(), c.building_id)
    )
    OR get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for bookings table
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view bookings in their buildings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = bookings.classroom_id
      AND is_manager_of_building(auth.uid(), c.building_id)
    )
    OR get_user_role(auth.uid()) IN ('manager', 'admin')
  );

CREATE POLICY "Admins can manage all bookings"
  ON bookings FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for reports table
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view reports in their buildings"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = reports.classroom_id
      AND is_manager_of_building(auth.uid(), c.building_id)
    )
    OR get_user_role(auth.uid()) IN ('manager', 'admin')
  );

CREATE POLICY "Managers can update reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = reports.classroom_id
      AND is_manager_of_building(auth.uid(), c.building_id)
    )
    OR get_user_role(auth.uid()) IN ('manager', 'admin')
  );

-- RLS Policies for audit_logs table
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, role, name, id_number)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'id_number', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_schedules_updated_at
  BEFORE UPDATE ON class_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

