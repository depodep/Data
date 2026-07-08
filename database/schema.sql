CREATE DATABASE IF NOT EXISTS data_science_hub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE data_science_hub;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE roles (
  role_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,
  role_slug VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_role_name (role_name),
  UNIQUE KEY uq_roles_role_slug (role_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id INT UNSIGNED NOT NULL,
  student_id VARCHAR(50) NULL,
  employee_id VARCHAR(50) NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  avatar_path VARCHAR(255) NULL,
  status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_student_id (student_id),
  UNIQUE KEY uq_users_employee_id (employee_id),
  KEY idx_users_role_id (role_id),
  KEY idx_users_status (status),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles (role_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE datasets (
  dataset_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id INT UNSIGNED NOT NULL,
  dataset_name VARCHAR(150) NOT NULL,
  dataset_description TEXT NULL,
  source_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  file_type VARCHAR(50) NOT NULL,
  record_count INT UNSIGNED NOT NULL DEFAULT 0,
  column_count TINYINT UNSIGNED NOT NULL DEFAULT 10,
  shared_scope ENUM('private', 'shared', 'public') NOT NULL DEFAULT 'private',
  processing_status ENUM('uploaded', 'validated', 'cleaned', 'analyzed', 'predicted', 'archived') NOT NULL DEFAULT 'uploaded',
  upload_hash CHAR(64) NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  validated_at DATETIME NULL,
  cleaned_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (dataset_id),
  UNIQUE KEY uq_datasets_upload_hash (upload_hash),
  KEY idx_datasets_owner_user_id (owner_user_id),
  KEY idx_datasets_shared_scope (shared_scope),
  KEY idx_datasets_processing_status (processing_status),
  KEY idx_datasets_uploaded_at (uploaded_at),
  CONSTRAINT fk_datasets_owner_user
    FOREIGN KEY (owner_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dataset_records (
  record_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dataset_id INT UNSIGNED NOT NULL,
  row_number INT UNSIGNED NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  course VARCHAR(100) NOT NULL,
  year_level VARCHAR(50) NOT NULL,
  section VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  quiz_score DECIMAL(5,2) NULL,
  midterm_score DECIMAL(5,2) NULL,
  final_score DECIMAL(5,2) NULL,
  attendance DECIMAL(5,2) NULL,
  is_valid TINYINT(1) NOT NULL DEFAULT 1,
  validation_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (record_id),
  UNIQUE KEY uq_dataset_records_row_number (dataset_id, row_number),
  KEY idx_dataset_records_dataset_id (dataset_id),
  KEY idx_dataset_records_student_id (student_id),
  KEY idx_dataset_records_course (course),
  KEY idx_dataset_records_subject (subject),
  CONSTRAINT fk_dataset_records_dataset
    FOREIGN KEY (dataset_id) REFERENCES datasets (dataset_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE analysis_results (
  analysis_result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dataset_id INT UNSIGNED NOT NULL,
  run_by_user_id INT UNSIGNED NOT NULL,
  analysis_mode VARCHAR(50) NOT NULL DEFAULT 'descriptive',
  status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed',
  result_summary TEXT NULL,
  metrics_json LONGTEXT NULL,
  insights_json LONGTEXT NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (analysis_result_id),
  KEY idx_analysis_results_dataset_id (dataset_id),
  KEY idx_analysis_results_run_by_user_id (run_by_user_id),
  KEY idx_analysis_results_status (status),
  KEY idx_analysis_results_created_at (created_at),
  CONSTRAINT fk_analysis_results_dataset
    FOREIGN KEY (dataset_id) REFERENCES datasets (dataset_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_analysis_results_user
    FOREIGN KEY (run_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prediction_results (
  prediction_result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dataset_id INT UNSIGNED NOT NULL,
  run_by_user_id INT UNSIGNED NOT NULL,
  model_type ENUM('linear_regression', 'logistic_regression', 'knn') NOT NULL,
  target_column VARCHAR(100) NOT NULL,
  feature_columns_json LONGTEXT NOT NULL,
  training_rows INT UNSIGNED NOT NULL DEFAULT 0,
  testing_rows INT UNSIGNED NOT NULL DEFAULT 0,
  accuracy DECIMAL(6,4) NULL,
  metrics_json LONGTEXT NULL,
  predictions_json LONGTEXT NULL,
  status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (prediction_result_id),
  KEY idx_prediction_results_dataset_id (dataset_id),
  KEY idx_prediction_results_run_by_user_id (run_by_user_id),
  KEY idx_prediction_results_model_type (model_type),
  KEY idx_prediction_results_status (status),
  KEY idx_prediction_results_created_at (created_at),
  CONSTRAINT fk_prediction_results_dataset
    FOREIGN KEY (dataset_id) REFERENCES datasets (dataset_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_prediction_results_user
    FOREIGN KEY (run_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
  report_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dataset_id INT UNSIGNED NOT NULL,
  analysis_result_id BIGINT UNSIGNED NULL,
  prediction_result_id BIGINT UNSIGNED NULL,
  generated_by_user_id INT UNSIGNED NOT NULL,
  report_type ENUM('cleaning', 'analysis', 'prediction') NOT NULL,
  report_title VARCHAR(150) NOT NULL,
  report_format ENUM('pdf', 'excel', 'csv') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('generated', 'archived', 'failed') NOT NULL DEFAULT 'generated',
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id),
  KEY idx_reports_dataset_id (dataset_id),
  KEY idx_reports_analysis_result_id (analysis_result_id),
  KEY idx_reports_prediction_result_id (prediction_result_id),
  KEY idx_reports_generated_by_user_id (generated_by_user_id),
  KEY idx_reports_report_type (report_type),
  KEY idx_reports_report_format (report_format),
  KEY idx_reports_generated_at (generated_at),
  CONSTRAINT fk_reports_dataset
    FOREIGN KEY (dataset_id) REFERENCES datasets (dataset_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_reports_analysis_result
    FOREIGN KEY (analysis_result_id) REFERENCES analysis_results (analysis_result_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_reports_prediction_result
    FOREIGN KEY (prediction_result_id) REFERENCES prediction_results (prediction_result_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_reports_generated_by_user
    FOREIGN KEY (generated_by_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_logs (
  activity_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  dataset_id INT UNSIGNED NULL,
  report_id BIGINT UNSIGNED NULL,
  activity_type VARCHAR(100) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id BIGINT UNSIGNED NULL,
  description TEXT NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  metadata_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_log_id),
  KEY idx_activity_logs_user_id (user_id),
  KEY idx_activity_logs_dataset_id (dataset_id),
  KEY idx_activity_logs_report_id (report_id),
  KEY idx_activity_logs_activity_type (activity_type),
  KEY idx_activity_logs_module_name (module_name),
  KEY idx_activity_logs_created_at (created_at),
  CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_activity_logs_dataset
    FOREIGN KEY (dataset_id) REFERENCES datasets (dataset_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_activity_logs_report
    FOREIGN KEY (report_id) REFERENCES reports (report_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
