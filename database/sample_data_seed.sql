USE data_science_hub_dev;

-- Insert a sample teacher user
INSERT INTO users (role_id, full_name, email, password_hash, status, created_at, updated_at)
VALUES
  (2, 'Sample Teacher', 'teacher@example.com', '$2y$10$IQAimQpHGpPs0kOQ21uuPe3Aq5deLUXBn10AT0mTXKp9P7pqXzRoS', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), full_name = VALUES(full_name), password_hash = VALUES(password_hash), updated_at = NOW();

-- Insert sample students
INSERT INTO users (role_id, student_id, full_name, email, password_hash, status, created_at, updated_at)
VALUES
  (3, 'student1', 'Student One', 'student1@students.local', '$2y$10$bhhC2ykwDpdjz1Ilz7gtLOLqnL59s4eFsHzW.enQJDTq3OXZbQpOq', 'active', NOW(), NOW()),
  (3, 'student2', 'Student Two', 'student2@students.local', '$2y$10$PFHBTEVJCmGQ2xZDu/Oe8.vaDb4N6Rb7AcI9CE/Fe9Cdhhl1D68zG', 'active', NOW(), NOW()),
  (3, 'student3', 'Student Three', 'student3@students.local', '$2y$10$0XnKcibJk8nNP1GFHZFNZuS3u4C.Jt0ta5u8kg7eN/LcKKht5OaJm', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), full_name = VALUES(full_name), password_hash = VALUES(password_hash), updated_at = NOW();

-- Create a sample dataset owned by the sample teacher
INSERT INTO datasets (owner_user_id, dataset_name, dataset_description, source_filename, stored_filename, file_path, file_size, file_type, record_count, column_count, shared_scope, processing_status, upload_hash, uploaded_at, created_at, updated_at)
VALUES (
  (SELECT user_id FROM users WHERE email = 'teacher@example.com' LIMIT 1),
  'Sample Students Dataset',
  'A small dataset for testing student views and visualizations',
  'students_sample.csv',
  'students_sample_stored.csv',
  '/Data/uploads/students_sample_stored.csv',
  1234,
  'text/csv',
  3,
  10,
  'shared',
  'validated',
  'sample_students_upload_hash',
  NOW(), NOW(), NOW()
)
ON DUPLICATE KEY UPDATE dataset_name = VALUES(dataset_name), dataset_description = VALUES(dataset_description), updated_at = NOW();

-- Insert dataset_records for the three students
SET @did = (SELECT dataset_id FROM datasets WHERE upload_hash = 'sample_students_upload_hash' LIMIT 1);
INSERT INTO dataset_records (dataset_id, row_number, student_id, student_name, course, year_level, section, subject, quiz_score, midterm_score, final_score, attendance, is_valid, created_at, updated_at)
VALUES
  (@did, 1, 'student1', 'Student One', 'Computer Science', '2', 'A', 'Mathematics', 85.00, 78.50, 80.00, 95.00, 1, NOW(), NOW()),
  (@did, 2, 'student2', 'Student Two', 'Computer Science', '2', 'A', 'Mathematics', 70.00, 65.50, 72.00, 88.00, 1, NOW(), NOW()),
  (@did, 3, 'student3', 'Student Three', 'Computer Science', '2', 'A', 'Mathematics', NULL, NULL, NULL, NULL, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE student_name = VALUES(student_name), quiz_score = VALUES(quiz_score), midterm_score = VALUES(midterm_score), final_score = VALUES(final_score), attendance = VALUES(attendance), is_valid = VALUES(is_valid), updated_at = NOW();
