-- Seed data for DLSU Classroom Finder
-- Insert sample buildings and classrooms

-- Step 1: Insert Buildings
INSERT INTO buildings (id, name, code, floors) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Gokongwei Hall', 'GH', 12),
  ('22222222-2222-2222-2222-222222222222', 'St. La Salle Hall', 'LS', 8),
  ('33333333-3333-3333-3333-333333333333', 'Miguel Hall', 'MH', 4),
  ('44444444-4444-4444-4444-444444444444', 'Velasco Hall', 'VH', 5),
  ('55555555-5555-5555-5555-555555555555', 'Science and Technology Research Center', 'STRC', 8)
ON CONFLICT (code) DO NOTHING;

-- Step 2: Insert Classrooms for Gokongwei Hall
INSERT INTO classrooms (building_id, room_number, floor, capacity, amenities, current_status) VALUES
  -- Ground Floor
  ('11111111-1111-1111-1111-111111111111', 'G101', 0, 30, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('11111111-1111-1111-1111-111111111111', 'G102', 0, 35, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('11111111-1111-1111-1111-111111111111', 'G103', 0, 40, '["Projector", "Smart Board", "AC"]', 'available'),
  
  -- 2nd Floor
  ('11111111-1111-1111-1111-111111111111', '201', 2, 45, '["Projector", "Whiteboard", "AC", "Sound System"]', 'available'),
  ('11111111-1111-1111-1111-111111111111', '202', 2, 50, '["Projector", "Smart Board", "AC"]', 'available'),
  ('11111111-1111-1111-1111-111111111111', '203', 2, 40, '["Projector", "Whiteboard", "AC"]', 'available'),
  
  -- 3rd Floor
  ('11111111-1111-1111-1111-111111111111', '301', 3, 60, '["Projector", "Whiteboard", "AC", "Sound System"]', 'available'),
  ('11111111-1111-1111-1111-111111111111', '302', 3, 55, '["Projector", "Smart Board", "AC"]', 'available'),
  ('11111111-1111-1111-1111-111111111111', '303', 3, 45, '["Projector", "Whiteboard", "AC"]', 'available'),
  
  -- 5th Floor (Computer Labs)
  ('11111111-1111-1111-1111-111111111111', '501', 5, 35, '["Computers", "Projector", "Whiteboard", "AC"]', 'available'),
  ('11111111-1111-1111-1111-111111111111', '502', 5, 35, '["Computers", "Projector", "Whiteboard", "AC"]', 'available')
ON CONFLICT (building_id, room_number) DO NOTHING;

-- Step 3: Insert Classrooms for St. La Salle Hall
INSERT INTO classrooms (building_id, room_number, floor, capacity, amenities, current_status) VALUES
  -- 2nd Floor
  ('22222222-2222-2222-2222-222222222222', 'LS201', 2, 50, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('22222222-2222-2222-2222-222222222222', 'LS202', 2, 45, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('22222222-2222-2222-2222-222222222222', 'LS203', 2, 40, '["Projector", "Smart Board", "AC"]', 'available'),
  
  -- 3rd Floor
  ('22222222-2222-2222-2222-222222222222', 'LS301', 3, 55, '["Projector", "Whiteboard", "AC", "Sound System"]', 'available'),
  ('22222222-2222-2222-2222-222222222222', 'LS302', 3, 50, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('22222222-2222-2222-2222-222222222222', 'LS303', 3, 45, '["Projector", "Smart Board", "AC"]', 'available'),
  
  -- 4th Floor
  ('22222222-2222-2222-2222-222222222222', 'LS401', 4, 60, '["Projector", "Whiteboard", "AC", "Sound System"]', 'available'),
  ('22222222-2222-2222-2222-222222222222', 'LS402', 4, 55, '["Projector", "Smart Board", "AC"]', 'available')
ON CONFLICT (building_id, room_number) DO NOTHING;

-- Step 4: Insert Classrooms for Miguel Hall
INSERT INTO classrooms (building_id, room_number, floor, capacity, amenities, current_status) VALUES
  -- Ground Floor
  ('33333333-3333-3333-3333-333333333333', 'MH101', 0, 30, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('33333333-3333-3333-3333-333333333333', 'MH102', 0, 35, '["Projector", "Whiteboard", "AC"]', 'available'),
  
  -- 2nd Floor
  ('33333333-3333-3333-3333-333333333333', 'MH201', 2, 40, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('33333333-3333-3333-3333-333333333333', 'MH202', 2, 40, '["Projector", "Smart Board", "AC"]', 'available'),
  
  -- 3rd Floor
  ('33333333-3333-3333-3333-333333333333', 'MH301', 3, 45, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('33333333-3333-3333-3333-333333333333', 'MH302', 3, 45, '["Projector", "Smart Board", "AC", "Sound System"]', 'available')
ON CONFLICT (building_id, room_number) DO NOTHING;

-- Step 5: Insert Classrooms for Velasco Hall
INSERT INTO classrooms (building_id, room_number, floor, capacity, amenities, current_status) VALUES
  -- 2nd Floor
  ('44444444-4444-4444-4444-444444444444', 'VH201', 2, 50, '["Projector", "Whiteboard", "AC"]', 'available'),
  ('44444444-4444-4444-4444-444444444444', 'VH202', 2, 50, '["Projector", "Smart Board", "AC"]', 'available'),
  
  -- 3rd Floor
  ('44444444-4444-4444-4444-444444444444', 'VH301', 3, 55, '["Projector", "Whiteboard", "AC", "Sound System"]', 'available'),
  ('44444444-4444-4444-4444-444444444444', 'VH302', 3, 55, '["Projector", "Smart Board", "AC"]', 'available'),
  
  -- 4th Floor
  ('44444444-4444-4444-4444-444444444444', 'VH401', 4, 60, '["Projector", "Whiteboard", "AC", "Sound System"]', 'available'),
  ('44444444-4444-4444-4444-444444444444', 'VH402', 4, 60, '["Projector", "Smart Board", "AC", "Computers"]', 'available')
ON CONFLICT (building_id, room_number) DO NOTHING;

-- Step 6: Insert Classrooms for STRC
INSERT INTO classrooms (building_id, room_number, floor, capacity, amenities, current_status) VALUES
  -- 2nd Floor (Labs)
  ('55555555-5555-5555-5555-555555555555', 'STRC201', 2, 30, '["Lab Equipment", "Projector", "Whiteboard", "AC"]', 'available'),
  ('55555555-5555-5555-5555-555555555555', 'STRC202', 2, 30, '["Lab Equipment", "Projector", "Whiteboard", "AC"]', 'available'),
  
  -- 3rd Floor
  ('55555555-5555-5555-5555-555555555555', 'STRC301', 3, 40, '["Projector", "Smart Board", "AC"]', 'available'),
  ('55555555-5555-5555-5555-555555555555', 'STRC302', 3, 40, '["Projector", "Whiteboard", "AC"]', 'available'),
  
  -- 5th Floor (Research Labs)
  ('55555555-5555-5555-5555-555555555555', 'STRC501', 5, 25, '["Lab Equipment", "Computers", "Projector", "AC"]', 'available'),
  ('55555555-5555-5555-5555-555555555555', 'STRC502', 5, 25, '["Lab Equipment", "Computers", "Projector", "AC"]', 'available')
ON CONFLICT (building_id, room_number) DO NOTHING;

-- Step 7: Add some sample class schedules (for testing conflict detection)
-- Monday, Wednesday, Friday classes
INSERT INTO class_schedules (classroom_id, course_code, instructor, days_of_week, start_time, end_time, start_date, end_date) VALUES
  (
    (SELECT id FROM classrooms WHERE room_number = '201' AND building_id = '11111111-1111-1111-1111-111111111111'),
    'CSMATH1',
    'Dr. Juan Dela Cruz',
    ARRAY[1, 3, 5], -- Monday, Wednesday, Friday
    '09:00',
    '10:30',
    '2024-09-01',
    '2024-12-15'
  ),
  (
    (SELECT id FROM classrooms WHERE room_number = '202' AND building_id = '11111111-1111-1111-1111-111111111111'),
    'CSALGCM',
    'Prof. Maria Santos',
    ARRAY[2, 4], -- Tuesday, Thursday
    '10:30',
    '12:00',
    '2024-09-01',
    '2024-12-15'
  ),
  (
    (SELECT id FROM classrooms WHERE room_number = 'LS201' AND building_id = '22222222-2222-2222-2222-222222222222'),
    'PHILOS1',
    'Dr. Pedro Garcia',
    ARRAY[1, 3, 5], -- Monday, Wednesday, Friday
    '13:00',
    '14:30',
    '2024-09-01',
    '2024-12-15'
  )
ON CONFLICT DO NOTHING;

-- Verify data was inserted
SELECT 'Seed data inserted successfully!' as status;
SELECT 'Buildings: ' || COUNT(*) as buildings_count FROM buildings;
SELECT 'Classrooms: ' || COUNT(*) as classrooms_count FROM classrooms;
SELECT 'Schedules: ' || COUNT(*) as schedules_count FROM class_schedules;

