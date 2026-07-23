-- phpMyAdmin SQL Dump (Cleaned)
-- Auto-generated: only tables actually used by the application
--
-- Host: 127.0.0.1
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `data_science_hub`
--

CREATE DATABASE IF NOT EXISTS `data_science_hub`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `data_science_hub`;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL,
  `role_slug` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_roles_role_name` (`role_name`),
  UNIQUE KEY `uq_roles_role_slug` (`role_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`, `role_slug`, `description`, `is_active`) VALUES
(1, 'Administrator', 'administrator', 'System administrator with full access', 1),
(2, 'Teacher', 'teacher', 'Course instructor – can manage datasets, run analytics, generate reports', 1),
(3, 'Student', 'student', 'Learner – read-only access to linked datasets', 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `student_id` VARCHAR(50) DEFAULT NULL,
  `employee_id` VARCHAR(50) DEFAULT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `avatar_path` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active','inactive','pending') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_student_id` (`student_id`),
  UNIQUE KEY `uq_users_employee_id` (`employee_id`),
  KEY `idx_users_role_id` (`role_id`),
  KEY `idx_users_status` (`status`),
  CONSTRAINT `fk_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Seed accounts (all passwords: password123)
-- Students log in with their student_id; admin & teacher use email.
--

INSERT INTO `users` (`role_id`, `student_id`, `full_name`, `email`, `password_hash`, `status`) VALUES
(1, NULL, 'Administrator',   'admin@test.com',           '$2y$10$aGJtifE/H3ci9jrnrrj8PO2ZqbH/Y/CYRzL7YTaEl0rhhGAJLrLRK', 'active'),
(2, NULL, 'Juan Delacruz',   'juastdelacruz@test.com',   '$2y$10$aGJtifE/H3ci9jrnrrj8PO2ZqbH/Y/CYRzL7YTaEl0rhhGAJLrLRK', 'active'),
(3, '41382',    'Student One',       'student1@internal.local',  '$2y$10$aGJtifE/H3ci9jrnrrj8PO2ZqbH/Y/CYRzL7YTaEl0rhhGAJLrLRK', 'active'),
(3, '52714',    'Santos, Maria',     'student2@internal.local',  '$2y$10$aGJtifE/H3ci9jrnrrj8PO2ZqbH/Y/CYRzL7YTaEl0rhhGAJLrLRK', 'active'),
(3, 'student3', 'Student Three',     'student3@internal.local',  '$2y$10$aGJtifE/H3ci9jrnrrj8PO2ZqbH/Y/CYRzL7YTaEl0rhhGAJLrLRK', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `datasets`
--

CREATE TABLE `datasets` (
  `dataset_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_user_id` INT UNSIGNED NOT NULL,
  `dataset_name` VARCHAR(150) NOT NULL,
  `dataset_description` TEXT DEFAULT NULL,
  `source_filename` VARCHAR(255) NOT NULL,
  `stored_filename` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `file_type` VARCHAR(50) NOT NULL,
  `record_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `column_count` TINYINT UNSIGNED NOT NULL DEFAULT 10,
  `shared_scope` ENUM('private','shared','public') NOT NULL DEFAULT 'private',
  `processing_status` ENUM('uploaded','validated','cleaned','analyzed','predicted','archived') NOT NULL DEFAULT 'uploaded',
  `upload_hash` CHAR(64) DEFAULT NULL,
  `uploaded_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `validated_at` DATETIME DEFAULT NULL,
  `cleaned_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`dataset_id`),
  UNIQUE KEY `uq_datasets_upload_hash` (`upload_hash`),
  KEY `idx_datasets_owner_user_id` (`owner_user_id`),
  KEY `idx_datasets_shared_scope` (`shared_scope`),
  KEY `idx_datasets_processing_status` (`processing_status`),
  KEY `idx_datasets_uploaded_at` (`uploaded_at`),
  CONSTRAINT `fk_datasets_owner_user`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dataset_records`
-- Stores individual student rows imported from a CSV dataset
--

CREATE TABLE `dataset_records` (
  `record_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataset_id` INT UNSIGNED NOT NULL,
  `row_number` INT UNSIGNED NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `course` VARCHAR(100) NOT NULL,
  `year_level` VARCHAR(50) NOT NULL,
  `section` VARCHAR(50) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `quiz_score` DECIMAL(5,2) DEFAULT NULL,
  `midterm_score` DECIMAL(5,2) DEFAULT NULL,
  `final_score` DECIMAL(5,2) DEFAULT NULL,
  `attendance` DECIMAL(5,2) DEFAULT NULL,
  `is_valid` TINYINT(1) NOT NULL DEFAULT 1,
  `validation_notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `uq_dataset_records_row_number` (`dataset_id`, `row_number`),
  KEY `idx_dataset_records_dataset_id` (`dataset_id`),
  KEY `idx_dataset_records_student_id` (`student_id`),
  KEY `idx_dataset_records_course` (`course`),
  KEY `idx_dataset_records_subject` (`subject`),
  CONSTRAINT `fk_dataset_records_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`dataset_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dataset_columns`
-- Stores detected column metadata for a dataset
--

CREATE TABLE `dataset_columns` (
  `column_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataset_id` INT UNSIGNED NOT NULL,
  `column_name` VARCHAR(191) NOT NULL,
  `ordinal_position` SMALLINT UNSIGNED NOT NULL,
  `detected_data_type` ENUM('integer','decimal','date','datetime','boolean','text','categorical','unknown') NOT NULL DEFAULT 'unknown',
  `is_nullable` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`column_id`),
  UNIQUE KEY `uq_dataset_columns_dataset_name` (`dataset_id`, `column_name`),
  KEY `idx_dataset_columns_dataset_id` (`dataset_id`),
  CONSTRAINT `fk_dataset_columns_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`dataset_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
-- Queue for async processing (clean, analyze, visualize, predict)
--

CREATE TABLE `jobs` (
  `job_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `job_type` VARCHAR(100) NOT NULL,
  `dataset_id` INT UNSIGNED DEFAULT NULL,
  `run_by_user_id` INT UNSIGNED DEFAULT NULL,
  `payload_json` LONGTEXT DEFAULT NULL,
  `result_json` LONGTEXT DEFAULT NULL,
  `status` ENUM('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  `priority` INT NOT NULL DEFAULT 5,
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`job_id`),
  KEY `idx_jobs_status` (`status`),
  KEY `idx_jobs_dataset_id` (`dataset_id`),
  KEY `idx_jobs_run_by_user_id` (`run_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `analysis_results`
--

CREATE TABLE `analysis_results` (
  `analysis_result_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataset_id` INT UNSIGNED NOT NULL,
  `run_by_user_id` INT UNSIGNED NOT NULL,
  `analysis_mode` VARCHAR(50) NOT NULL DEFAULT 'descriptive',
  `status` ENUM('pending','completed','failed') NOT NULL DEFAULT 'completed',
  `result_summary` TEXT DEFAULT NULL,
  `metrics_json` LONGTEXT DEFAULT NULL,
  `insights_json` LONGTEXT DEFAULT NULL,
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`analysis_result_id`),
  KEY `idx_analysis_results_dataset_id` (`dataset_id`),
  KEY `idx_analysis_results_run_by_user_id` (`run_by_user_id`),
  KEY `idx_analysis_results_status` (`status`),
  KEY `idx_analysis_results_created_at` (`created_at`),
  CONSTRAINT `fk_analysis_results_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`dataset_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_analysis_results_user`
    FOREIGN KEY (`run_by_user_id`) REFERENCES `users` (`user_id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cleaning_results`
--

CREATE TABLE `cleaning_results` (
  `cleaning_result_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataset_id` INT UNSIGNED NOT NULL,
  `run_by_user_id` INT UNSIGNED NOT NULL,
  `removed_duplicates` INT UNSIGNED NOT NULL DEFAULT 0,
  `summary_json` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cleaning_result_id`),
  KEY `idx_cleaning_results_dataset_id` (`dataset_id`),
  KEY `idx_cleaning_results_run_by_user_id` (`run_by_user_id`),
  KEY `idx_cleaning_results_created_at` (`created_at`),
  CONSTRAINT `fk_cleaning_results_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`dataset_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_cleaning_results_user`
    FOREIGN KEY (`run_by_user_id`) REFERENCES `users` (`user_id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `visualization_results`
--

CREATE TABLE `visualization_results` (
  `visualization_result_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataset_id` INT UNSIGNED NOT NULL,
  `run_by_user_id` INT UNSIGNED NOT NULL,
  `chart_paths_json` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`visualization_result_id`),
  KEY `idx_visualization_results_dataset_id` (`dataset_id`),
  KEY `idx_visualization_results_run_by_user_id` (`run_by_user_id`),
  KEY `idx_visualization_results_created_at` (`created_at`),
  CONSTRAINT `fk_visualization_results_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`dataset_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_visualization_results_user`
    FOREIGN KEY (`run_by_user_id`) REFERENCES `users` (`user_id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prediction_results`
--

CREATE TABLE `prediction_results` (
  `prediction_result_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataset_id` INT UNSIGNED NOT NULL,
  `run_by_user_id` INT UNSIGNED NOT NULL,
  `model_type` ENUM('linear_regression','logistic_regression','knn') NOT NULL,
  `target_column` VARCHAR(100) NOT NULL,
  `feature_columns_json` LONGTEXT NOT NULL,
  `training_rows` INT UNSIGNED NOT NULL DEFAULT 0,
  `testing_rows` INT UNSIGNED NOT NULL DEFAULT 0,
  `accuracy` DECIMAL(6,4) DEFAULT NULL,
  `metrics_json` LONGTEXT DEFAULT NULL,
  `predictions_json` LONGTEXT DEFAULT NULL,
  `model_path` VARCHAR(500) DEFAULT NULL,
  `predictions_path` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('pending','completed','failed') NOT NULL DEFAULT 'completed',
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`prediction_result_id`),
  KEY `idx_prediction_results_dataset_id` (`dataset_id`),
  KEY `idx_prediction_results_run_by_user_id` (`run_by_user_id`),
  KEY `idx_prediction_results_model_type` (`model_type`),
  KEY `idx_prediction_results_status` (`status`),
  KEY `idx_prediction_results_created_at` (`created_at`),
  CONSTRAINT `fk_prediction_results_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`dataset_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_prediction_results_user`
    FOREIGN KEY (`run_by_user_id`) REFERENCES `users` (`user_id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `report_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dataset_id` INT UNSIGNED NOT NULL,
  `analysis_result_id` BIGINT UNSIGNED DEFAULT NULL,
  `prediction_result_id` BIGINT UNSIGNED DEFAULT NULL,
  `generated_by_user_id` INT UNSIGNED NOT NULL,
  `report_type` ENUM('cleaning','analysis','prediction') NOT NULL,
  `report_title` VARCHAR(150) NOT NULL,
  `report_format` ENUM('pdf','excel','csv') NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('generated','archived','failed') NOT NULL DEFAULT 'generated',
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`),
  KEY `idx_reports_dataset_id` (`dataset_id`),
  KEY `idx_reports_analysis_result_id` (`analysis_result_id`),
  KEY `idx_reports_prediction_result_id` (`prediction_result_id`),
  KEY `idx_reports_generated_by_user_id` (`generated_by_user_id`),
  KEY `idx_reports_report_type` (`report_type`),
  KEY `idx_reports_report_format` (`report_format`),
  KEY `idx_reports_generated_at` (`generated_at`),
  CONSTRAINT `fk_reports_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`dataset_id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_reports_analysis_result`
    FOREIGN KEY (`analysis_result_id`) REFERENCES `analysis_results` (`analysis_result_id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_reports_prediction_result`
    FOREIGN KEY (`prediction_result_id`) REFERENCES `prediction_results` (`prediction_result_id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_reports_generated_by_user`
    FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`user_id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
-- Audit trail for all user actions across the system
--

CREATE TABLE `activity_logs` (
  `activity_log_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `dataset_id` INT UNSIGNED DEFAULT NULL,
  `report_id` BIGINT UNSIGNED DEFAULT NULL,
  `activity_type` VARCHAR(100) NOT NULL,
  `module_name` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) DEFAULT NULL,
  `entity_id` BIGINT UNSIGNED DEFAULT NULL,
  `description` TEXT NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `metadata_json` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_log_id`),
  KEY `idx_activity_logs_user_id` (`user_id`),
  KEY `idx_activity_logs_dataset_id` (`dataset_id`),
  KEY `idx_activity_logs_report_id` (`report_id`),
  KEY `idx_activity_logs_activity_type` (`activity_type`),
  KEY `idx_activity_logs_module_name` (`module_name`),
  KEY `idx_activity_logs_created_at` (`created_at`),
  CONSTRAINT `fk_activity_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_activity_logs_dataset`
    FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`dataset_id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT `fk_activity_logs_report`
    FOREIGN KEY (`report_id`) REFERENCES `reports` (`report_id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

/*
  Seed Account Credentials (all passwords: password123)
  -------------------------------------------------------
  Role            Name             Login Credential
  Administrator   Administrator    admin@test.com
  Teacher         Juan Delacruz   juastdelacruz@test.com
  Student         Student One      Student ID: 41382
  Student         Santos, Maria    Student ID: 52714
  Student         Student Three    Student ID: student3
*/
