-- Create user_buildings junction table
-- This replaces the assigned_buildings array approach for better relational design
CREATE TABLE IF NOT EXISTS user_buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, building_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_buildings_user_id ON user_buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_buildings_building_id ON user_buildings(building_id);

-- Enable Row Level Security
ALTER TABLE user_buildings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_buildings table
-- Managers can view their own building assignments
CREATE POLICY "Users can view their own building assignments"
  ON user_buildings FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all building assignments
CREATE POLICY "Admins can view all building assignments"
  ON user_buildings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can manage building assignments
CREATE POLICY "Admins can manage building assignments"
  ON user_buildings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Authenticated users can insert their own building assignments (for admin setup)
CREATE POLICY "System can insert building assignments"
  ON user_buildings FOR INSERT
  WITH CHECK (true);

-- Seed data: Assign some example managers to buildings if data exists
-- This is optional - admin can do this manually through the admin interface
DO $$
DECLARE
  v_manager_user_id UUID;
  v_building_id UUID;
BEGIN
  -- Find a manager user and a building to assign
  SELECT u.id INTO v_manager_user_id
  FROM users u
  WHERE u.role = 'manager'
  LIMIT 1;
  
  SELECT b.id INTO v_building_id
  FROM buildings b
  LIMIT 1;
  
  -- Only insert if both exist and the assignment doesn't already exist
  IF v_manager_user_id IS NOT NULL AND v_building_id IS NOT NULL THEN
    INSERT INTO user_buildings (user_id, building_id)
    VALUES (v_manager_user_id, v_building_id)
    ON CONFLICT (user_id, building_id) DO NOTHING;
  END IF;
END $$;
