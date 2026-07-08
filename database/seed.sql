USE data_science_hub;

-- Insert core roles with fixed IDs so we can reference them safely
INSERT INTO roles (role_id, role_name, role_slug, description, is_active, created_at, updated_at)
VALUES
  (1, 'Administrator', 'administrator', 'System administrator', 1, NOW(), NOW()),
  (2, 'Teacher', 'teacher', 'Course instructor', 1, NOW(), NOW()),
  (3, 'Student', 'student', 'Learner', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), role_slug = VALUES(role_slug), is_active = VALUES(is_active), updated_at = NOW();

-- Insert initial admin user (change email/password after importing if desired)
INSERT INTO users (role_id, full_name, email, password_hash, status, created_at, updated_at)
VALUES
  (1, 'Administrator', 'admin@example.com', '$2y$10$xLR5zQFgCvSm3fQWtruIfOdbMqaO96awdFT6TfUBuwdlmiyl6Xj/2', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), full_name = VALUES(full_name), password_hash = VALUES(password_hash), updated_at = NOW();
