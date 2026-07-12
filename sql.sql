-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 12, 2026 at 05:39 PM
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

-- --------------------------------------------------------

--
-- Table structure for table `analysis_insights`
--

CREATE TABLE `analysis_insights` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `analysis_job_id` bigint(20) UNSIGNED NOT NULL,
  `insight_type` varchar(100) NOT NULL,
  `insight_text` varchar(500) NOT NULL,
  `severity` enum('low','medium','high') NOT NULL DEFAULT 'low',
  `sort_order` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `analysis_jobs`
--

CREATE TABLE `analysis_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dataset_id` bigint(20) UNSIGNED NOT NULL,
  `cleaning_job_id` bigint(20) UNSIGNED DEFAULT NULL,
  `initiated_by` bigint(20) UNSIGNED NOT NULL,
  `status` enum('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `row_count` bigint(20) UNSIGNED DEFAULT NULL,
  `column_count` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `analysis_job_columns`
--

CREATE TABLE `analysis_job_columns` (
  `analysis_job_id` bigint(20) UNSIGNED NOT NULL,
  `dataset_column_id` bigint(20) UNSIGNED NOT NULL,
  `analysis_scope` enum('all','selected','target') NOT NULL DEFAULT 'all'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `analysis_metrics`
--

CREATE TABLE `analysis_metrics` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `analysis_job_id` bigint(20) UNSIGNED NOT NULL,
  `dataset_column_id` bigint(20) UNSIGNED DEFAULT NULL,
  `metric_name` varchar(100) NOT NULL,
  `metric_value_decimal` decimal(20,6) DEFAULT NULL,
  `metric_value_text` varchar(255) DEFAULT NULL,
  `metric_unit` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varbinary(16) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `charts`
--

CREATE TABLE `charts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dataset_id` bigint(20) UNSIGNED NOT NULL,
  `analysis_job_id` bigint(20) UNSIGNED DEFAULT NULL,
  `chart_type_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `chart_path` varchar(500) NOT NULL,
  `thumbnail_path` varchar(500) DEFAULT NULL,
  `x_axis_label` varchar(100) DEFAULT NULL,
  `y_axis_label` varchar(100) DEFAULT NULL,
  `color_scheme` varchar(100) DEFAULT NULL,
  `status` enum('queued','generated','failed','archived') NOT NULL DEFAULT 'queued',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chart_data_points`
--

CREATE TABLE `chart_data_points` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `chart_data_series_id` bigint(20) UNSIGNED NOT NULL,
  `point_label` varchar(191) NOT NULL,
  `x_value` decimal(20,6) DEFAULT NULL,
  `y_value` decimal(20,6) DEFAULT NULL,
  `sort_order` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chart_data_series`
--

CREATE TABLE `chart_data_series` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `chart_id` bigint(20) UNSIGNED NOT NULL,
  `series_name` varchar(100) NOT NULL,
  `ordinal_position` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chart_types`
--

CREATE TABLE `chart_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chart_types`
--

INSERT INTO `chart_types` (`id`, `code`, `name`, `description`) VALUES
(1, 'bar', 'Bar Chart', 'Vertical or horizontal bar chart'),
(2, 'line', 'Line Chart', 'Trend over time or sequence'),
(3, 'pie', 'Pie Chart', 'Part-to-whole distribution'),
(4, 'histogram', 'Histogram', 'Frequency distribution'),
(5, 'scatter', 'Scatter Plot', 'Relationship between two variables');

-- --------------------------------------------------------

--
-- Table structure for table `cleaning_jobs`
--

CREATE TABLE `cleaning_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dataset_id` bigint(20) UNSIGNED NOT NULL,
  `initiated_by` bigint(20) UNSIGNED NOT NULL,
  `input_file_id` bigint(20) UNSIGNED DEFAULT NULL,
  `output_file_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` enum('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `total_rows` bigint(20) UNSIGNED DEFAULT NULL,
  `cleaned_rows` bigint(20) UNSIGNED DEFAULT NULL,
  `duplicate_rows_removed` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `missing_values_filled` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `spaces_trimmed` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `text_standardized` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `dates_converted` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `data_types_fixed` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `outliers_flagged` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cleaning_job_columns`
--

CREATE TABLE `cleaning_job_columns` (
  `cleaning_job_id` bigint(20) UNSIGNED NOT NULL,
  `dataset_column_id` bigint(20) UNSIGNED NOT NULL,
  `action_scope` enum('all','selected','target') NOT NULL DEFAULT 'all'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cleaning_job_steps`
--

CREATE TABLE `cleaning_job_steps` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cleaning_job_id` bigint(20) UNSIGNED NOT NULL,
  `step_order` int(10) UNSIGNED NOT NULL,
  `step_name` varchar(100) NOT NULL,
  `step_result` varchar(100) NOT NULL,
  `affected_rows` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `datasets`
--

CREATE TABLE `datasets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `owner_user_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `dataset_name` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `file_extension` varchar(20) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size` bigint(20) UNSIGNED NOT NULL,
  `file_hash` char(64) NOT NULL,
  `source_type` enum('upload','import','api') NOT NULL DEFAULT 'upload',
  `visibility` enum('private','role','public') NOT NULL DEFAULT 'private',
  `status` enum('pending','uploaded','ready','processing','archived','deleted') NOT NULL DEFAULT 'uploaded',
  `row_count` bigint(20) UNSIGNED DEFAULT NULL,
  `column_count` int(10) UNSIGNED DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `processed_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dataset_categories`
--

CREATE TABLE `dataset_categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dataset_categories`
--

INSERT INTO `dataset_categories` (`id`, `name`, `slug`, `description`, `created_at`, `updated_at`) VALUES
(1, 'Business', 'business', 'Business and operational datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(2, 'Finance', 'finance', 'Financial and accounting datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(3, 'Healthcare', 'healthcare', 'Clinical and health-related datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(4, 'Education', 'education', 'Student and learning datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(5, 'Science', 'science', 'Scientific and research datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28');

-- --------------------------------------------------------

--
-- Table structure for table `dataset_columns`
--

CREATE TABLE `dataset_columns` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dataset_id` bigint(20) UNSIGNED NOT NULL,
  `column_name` varchar(191) NOT NULL,
  `ordinal_position` int(10) UNSIGNED NOT NULL,
  `detected_data_type` enum('integer','decimal','date','datetime','boolean','text','categorical','unknown') NOT NULL DEFAULT 'unknown',
  `is_nullable` tinyint(1) NOT NULL DEFAULT 1,
  `max_length` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dataset_column_stats`
--

CREATE TABLE `dataset_column_stats` (
  `dataset_column_id` bigint(20) UNSIGNED NOT NULL,
  `row_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `missing_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `unique_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `numeric_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `text_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `date_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `min_numeric_value` decimal(20,6) DEFAULT NULL,
  `max_numeric_value` decimal(20,6) DEFAULT NULL,
  `mean_numeric_value` decimal(20,6) DEFAULT NULL,
  `median_numeric_value` decimal(20,6) DEFAULT NULL,
  `variance_value` decimal(20,6) DEFAULT NULL,
  `std_dev_value` decimal(20,6) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dataset_files`
--

CREATE TABLE `dataset_files` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dataset_id` bigint(20) UNSIGNED NOT NULL,
  `file_role` enum('derived','cleaned','analysis_input','analysis_output','chart_input','report_attachment','export') NOT NULL DEFAULT 'derived',
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_extension` varchar(20) NOT NULL,
  `file_size` bigint(20) UNSIGNED NOT NULL,
  `file_hash` char(64) NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `job_id` bigint(20) UNSIGNED NOT NULL,
  `job_type` varchar(100) NOT NULL,
  `dataset_id` int(10) UNSIGNED DEFAULT NULL,
  `run_by_user_id` int(10) UNSIGNED DEFAULT NULL,
  `payload_json` longtext DEFAULT NULL,
  `result_json` longtext DEFAULT NULL,
  `status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  `priority` int(11) NOT NULL DEFAULT 5,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `notification_type` varchar(100) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `link_url` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `requested_ip` varbinary(16) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `module_name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `code`, `name`, `description`, `module_name`, `created_at`, `updated_at`) VALUES
(1, 'users.view', 'View Users', 'Can view user records', 'users', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(2, 'users.create', 'Create Users', 'Can create user records', 'users', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(3, 'users.update', 'Update Users', 'Can update user records', 'users', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(4, 'users.delete', 'Delete Users', 'Can delete user records', 'users', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(5, 'datasets.view', 'View Datasets', 'Can view datasets', 'datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(6, 'datasets.create', 'Create Datasets', 'Can upload datasets', 'datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(7, 'datasets.update', 'Update Datasets', 'Can edit dataset metadata', 'datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(8, 'datasets.delete', 'Delete Datasets', 'Can delete datasets', 'datasets', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(9, 'reports.view', 'View Reports', 'Can view generated reports', 'reports', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(10, 'reports.create', 'Create Reports', 'Can generate reports', 'reports', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(11, 'reports.export', 'Export Reports', 'Can export reports to files', 'reports', '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(12, 'analytics.run', 'Run Analytics', 'Can run cleaning, analysis, visualization, and prediction jobs', 'analytics', '2026-07-07 13:09:28', '2026-07-07 13:09:28');

-- --------------------------------------------------------

--
-- Table structure for table `prediction_confusion_matrix`
--

CREATE TABLE `prediction_confusion_matrix` (
  `prediction_job_id` bigint(20) UNSIGNED NOT NULL,
  `actual_label` varchar(191) NOT NULL,
  `predicted_label` varchar(191) NOT NULL,
  `cell_count` bigint(20) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prediction_jobs`
--

CREATE TABLE `prediction_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dataset_id` bigint(20) UNSIGNED NOT NULL,
  `cleaning_job_id` bigint(20) UNSIGNED DEFAULT NULL,
  `initiated_by` bigint(20) UNSIGNED NOT NULL,
  `model_type` enum('linear_regression','logistic_regression','knn') NOT NULL,
  `status` enum('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  `target_column_id` bigint(20) UNSIGNED DEFAULT NULL,
  `train_row_count` bigint(20) UNSIGNED DEFAULT NULL,
  `test_row_count` bigint(20) UNSIGNED DEFAULT NULL,
  `random_seed` int(10) UNSIGNED DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prediction_job_columns`
--

CREATE TABLE `prediction_job_columns` (
  `prediction_job_id` bigint(20) UNSIGNED NOT NULL,
  `dataset_column_id` bigint(20) UNSIGNED NOT NULL,
  `column_role` enum('feature','target') NOT NULL DEFAULT 'feature',
  `sort_order` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prediction_metrics`
--

CREATE TABLE `prediction_metrics` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `prediction_job_id` bigint(20) UNSIGNED NOT NULL,
  `metric_name` varchar(100) NOT NULL,
  `metric_value_decimal` decimal(20,6) DEFAULT NULL,
  `metric_value_text` varchar(255) DEFAULT NULL,
  `metric_unit` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prediction_outputs`
--

CREATE TABLE `prediction_outputs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `prediction_job_id` bigint(20) UNSIGNED NOT NULL,
  `row_number` bigint(20) UNSIGNED NOT NULL,
  `predicted_value` text DEFAULT NULL,
  `actual_value` text DEFAULT NULL,
  `probability` decimal(10,6) DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `remember_tokens`
--

CREATE TABLE `remember_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `selector` varchar(64) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dataset_id` bigint(20) UNSIGNED NOT NULL,
  `report_type_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `cleaning_job_id` bigint(20) UNSIGNED DEFAULT NULL,
  `analysis_job_id` bigint(20) UNSIGNED DEFAULT NULL,
  `prediction_job_id` bigint(20) UNSIGNED DEFAULT NULL,
  `chart_id` bigint(20) UNSIGNED DEFAULT NULL,
  `title` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `report_path` varchar(500) NOT NULL,
  `export_format` enum('pdf','csv','xlsx') NOT NULL,
  `status` enum('queued','generated','failed','archived') NOT NULL DEFAULT 'queued',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_exports`
--

CREATE TABLE `report_exports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `report_id` bigint(20) UNSIGNED NOT NULL,
  `export_format` enum('pdf','csv','xlsx') NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `report_types`
--

CREATE TABLE `report_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `report_types`
--

INSERT INTO `report_types` (`id`, `code`, `name`, `description`) VALUES
(1, 'cleaning', 'Cleaning Report', 'Summarizes cleaning operations and data quality fixes'),
(2, 'analysis', 'Analysis Report', 'Summarizes statistical analysis outputs'),
(3, 'prediction', 'Prediction Report', 'Summarizes machine learning outputs and metrics'),
(4, 'visualization', 'Visualization Report', 'Summarizes charts generated for a dataset'),
(5, 'dataset_summary', 'Dataset Summary', 'General dataset metadata and profile report');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `code`, `name`, `description`, `is_system`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Administrator', 'Full system access', 1, '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(2, 'teacher', 'Teacher', 'Can manage datasets and reports for assigned work', 1, '2026-07-07 13:09:28', '2026-07-07 13:09:28'),
(3, 'student', 'Student', 'Can only access owned datasets and reports', 1, '2026-07-07 13:09:28', '2026-07-07 13:09:28');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `granted_at`) VALUES
(1, 1, '2026-07-07 13:09:28'),
(1, 2, '2026-07-07 13:09:28'),
(1, 3, '2026-07-07 13:09:28'),
(1, 4, '2026-07-07 13:09:28'),
(1, 5, '2026-07-07 13:09:28'),
(1, 6, '2026-07-07 13:09:28'),
(1, 7, '2026-07-07 13:09:28'),
(1, 8, '2026-07-07 13:09:28'),
(1, 9, '2026-07-07 13:09:28'),
(1, 10, '2026-07-07 13:09:28'),
(1, 11, '2026-07-07 13:09:28'),
(1, 12, '2026-07-07 13:09:28'),
(2, 5, '2026-07-07 13:09:28'),
(2, 6, '2026-07-07 13:09:28'),
(2, 7, '2026-07-07 13:09:28'),
(2, 8, '2026-07-07 13:09:28'),
(2, 9, '2026-07-07 13:09:28'),
(2, 10, '2026-07-07 13:09:28'),
(2, 11, '2026-07-07 13:09:28'),
(2, 12, '2026-07-07 13:09:28'),
(3, 5, '2026-07-07 13:09:28'),
(3, 9, '2026-07-07 13:09:28');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `ip_address` varbinary(16) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_logs`
--

CREATE TABLE `system_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `log_level` enum('debug','info','warning','error','critical') NOT NULL DEFAULT 'info',
  `source` varchar(100) NOT NULL,
  `message` varchar(500) NOT NULL,
  `context` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  `data_type` enum('string','integer','boolean','json','text') NOT NULL DEFAULT 'string',
  `setting_group` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `avatar_path` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `status` enum('pending','active','inactive','suspended') NOT NULL DEFAULT 'active',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `assigned_by` bigint(20) UNSIGNED DEFAULT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `analysis_insights`
--
ALTER TABLE `analysis_insights`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_analysis_insights_job_id` (`analysis_job_id`),
  ADD KEY `idx_analysis_insights_severity` (`severity`);

--
-- Indexes for table `analysis_jobs`
--
ALTER TABLE `analysis_jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_analysis_jobs_dataset_id` (`dataset_id`),
  ADD KEY `idx_analysis_jobs_cleaning_job_id` (`cleaning_job_id`),
  ADD KEY `idx_analysis_jobs_initiated_by` (`initiated_by`),
  ADD KEY `idx_analysis_jobs_status` (`status`);

--
-- Indexes for table `analysis_job_columns`
--
ALTER TABLE `analysis_job_columns`
  ADD PRIMARY KEY (`analysis_job_id`,`dataset_column_id`),
  ADD KEY `idx_analysis_job_columns_dataset_column_id` (`dataset_column_id`);

--
-- Indexes for table `analysis_metrics`
--
ALTER TABLE `analysis_metrics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_analysis_metrics_job_id` (`analysis_job_id`),
  ADD KEY `idx_analysis_metrics_dataset_column_id` (`dataset_column_id`),
  ADD KEY `idx_analysis_metrics_metric_name` (`metric_name`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_logs_user_id` (`user_id`),
  ADD KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_logs_action` (`action`),
  ADD KEY `idx_audit_logs_created_at` (`created_at`);

--
-- Indexes for table `charts`
--
ALTER TABLE `charts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_charts_dataset_id` (`dataset_id`),
  ADD KEY `idx_charts_analysis_job_id` (`analysis_job_id`),
  ADD KEY `idx_charts_chart_type_id` (`chart_type_id`),
  ADD KEY `idx_charts_created_by` (`created_by`),
  ADD KEY `idx_charts_status` (`status`);

--
-- Indexes for table `chart_data_points`
--
ALTER TABLE `chart_data_points`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chart_data_points_series_id` (`chart_data_series_id`),
  ADD KEY `idx_chart_data_points_sort_order` (`sort_order`);

--
-- Indexes for table `chart_data_series`
--
ALTER TABLE `chart_data_series`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_chart_data_series_chart_order` (`chart_id`,`ordinal_position`),
  ADD KEY `idx_chart_data_series_chart_id` (`chart_id`);

--
-- Indexes for table `chart_types`
--
ALTER TABLE `chart_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_chart_types_code` (`code`),
  ADD UNIQUE KEY `uk_chart_types_name` (`name`);

--
-- Indexes for table `cleaning_jobs`
--
ALTER TABLE `cleaning_jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cleaning_jobs_dataset_id` (`dataset_id`),
  ADD KEY `idx_cleaning_jobs_initiated_by` (`initiated_by`),
  ADD KEY `idx_cleaning_jobs_status` (`status`),
  ADD KEY `fk_cleaning_jobs_input_file_id` (`input_file_id`),
  ADD KEY `fk_cleaning_jobs_output_file_id` (`output_file_id`);

--
-- Indexes for table `cleaning_job_columns`
--
ALTER TABLE `cleaning_job_columns`
  ADD PRIMARY KEY (`cleaning_job_id`,`dataset_column_id`),
  ADD KEY `idx_cleaning_job_columns_dataset_column_id` (`dataset_column_id`);

--
-- Indexes for table `cleaning_job_steps`
--
ALTER TABLE `cleaning_job_steps`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_cleaning_job_steps_job_order` (`cleaning_job_id`,`step_order`),
  ADD KEY `idx_cleaning_job_steps_job_id` (`cleaning_job_id`);

--
-- Indexes for table `datasets`
--
ALTER TABLE `datasets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_datasets_file_hash` (`file_hash`),
  ADD KEY `idx_datasets_category_id` (`category_id`),
  ADD KEY `idx_datasets_owner_user_id` (`owner_user_id`),
  ADD KEY `idx_datasets_created_by` (`created_by`),
  ADD KEY `idx_datasets_status` (`status`),
  ADD KEY `idx_datasets_visibility` (`visibility`),
  ADD KEY `idx_datasets_uploaded_at` (`uploaded_at`);

--
-- Indexes for table `dataset_categories`
--
ALTER TABLE `dataset_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_dataset_categories_name` (`name`),
  ADD UNIQUE KEY `uk_dataset_categories_slug` (`slug`);

--
-- Indexes for table `dataset_columns`
--
ALTER TABLE `dataset_columns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_dataset_columns_dataset_position` (`dataset_id`,`ordinal_position`),
  ADD UNIQUE KEY `uk_dataset_columns_dataset_name` (`dataset_id`,`column_name`),
  ADD KEY `idx_dataset_columns_dataset_id` (`dataset_id`),
  ADD KEY `idx_dataset_columns_detected_data_type` (`detected_data_type`);

--
-- Indexes for table `dataset_column_stats`
--
ALTER TABLE `dataset_column_stats`
  ADD PRIMARY KEY (`dataset_column_id`);

--
-- Indexes for table `dataset_files`
--
ALTER TABLE `dataset_files`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_dataset_files_file_hash` (`file_hash`),
  ADD KEY `idx_dataset_files_dataset_id` (`dataset_id`),
  ADD KEY `idx_dataset_files_file_role` (`file_role`),
  ADD KEY `idx_dataset_files_created_by` (`created_by`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`job_id`),
  ADD KEY `idx_jobs_status` (`status`),
  ADD KEY `idx_jobs_dataset_id` (`dataset_id`),
  ADD KEY `idx_jobs_run_by_user_id` (`run_by_user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user_id_is_read` (`user_id`,`is_read`),
  ADD KEY `idx_notifications_created_at` (`created_at`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_password_resets_token_hash` (`token_hash`),
  ADD KEY `idx_password_resets_user_id` (`user_id`),
  ADD KEY `idx_password_resets_expires_at` (`expires_at`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_permissions_code` (`code`),
  ADD KEY `idx_permissions_module_name` (`module_name`);

--
-- Indexes for table `prediction_confusion_matrix`
--
ALTER TABLE `prediction_confusion_matrix`
  ADD PRIMARY KEY (`prediction_job_id`,`actual_label`,`predicted_label`);

--
-- Indexes for table `prediction_jobs`
--
ALTER TABLE `prediction_jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prediction_jobs_dataset_id` (`dataset_id`),
  ADD KEY `idx_prediction_jobs_cleaning_job_id` (`cleaning_job_id`),
  ADD KEY `idx_prediction_jobs_initiated_by` (`initiated_by`),
  ADD KEY `idx_prediction_jobs_target_column_id` (`target_column_id`),
  ADD KEY `idx_prediction_jobs_status` (`status`);

--
-- Indexes for table `prediction_job_columns`
--
ALTER TABLE `prediction_job_columns`
  ADD PRIMARY KEY (`prediction_job_id`,`dataset_column_id`,`column_role`),
  ADD KEY `idx_prediction_job_columns_dataset_column_id` (`dataset_column_id`);

--
-- Indexes for table `prediction_metrics`
--
ALTER TABLE `prediction_metrics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_prediction_metrics_job_id` (`prediction_job_id`),
  ADD KEY `idx_prediction_metrics_metric_name` (`metric_name`);

--
-- Indexes for table `prediction_outputs`
--
ALTER TABLE `prediction_outputs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_prediction_outputs_job_row` (`prediction_job_id`,`row_number`),
  ADD KEY `idx_prediction_outputs_prediction_job_id` (`prediction_job_id`);

--
-- Indexes for table `remember_tokens`
--
ALTER TABLE `remember_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_remember_tokens_selector` (`selector`),
  ADD KEY `idx_remember_tokens_user_id` (`user_id`),
  ADD KEY `idx_remember_tokens_expires_at` (`expires_at`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reports_dataset_id` (`dataset_id`),
  ADD KEY `idx_reports_report_type_id` (`report_type_id`),
  ADD KEY `idx_reports_created_by` (`created_by`),
  ADD KEY `idx_reports_cleaning_job_id` (`cleaning_job_id`),
  ADD KEY `idx_reports_analysis_job_id` (`analysis_job_id`),
  ADD KEY `idx_reports_prediction_job_id` (`prediction_job_id`),
  ADD KEY `idx_reports_chart_id` (`chart_id`),
  ADD KEY `idx_reports_status` (`status`);

--
-- Indexes for table `report_exports`
--
ALTER TABLE `report_exports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_report_exports_report_id` (`report_id`),
  ADD KEY `idx_report_exports_export_format` (`export_format`);

--
-- Indexes for table `report_types`
--
ALTER TABLE `report_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_report_types_code` (`code`),
  ADD UNIQUE KEY `uk_report_types_name` (`name`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_roles_code` (`code`),
  ADD UNIQUE KEY `uk_roles_name` (`name`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `idx_role_permissions_permission_id` (`permission_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `idx_sessions_user_id` (`user_id`),
  ADD KEY `idx_sessions_last_activity_at` (`last_activity_at`);

--
-- Indexes for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_system_logs_user_id` (`user_id`),
  ADD KEY `idx_system_logs_level` (`log_level`),
  ADD KEY `idx_system_logs_source` (`source`),
  ADD KEY `idx_system_logs_created_at` (`created_at`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_key`),
  ADD KEY `idx_system_settings_group` (`setting_group`),
  ADD KEY `idx_system_settings_updated_by` (`updated_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_users_username` (`username`),
  ADD UNIQUE KEY `uk_users_email` (`email`),
  ADD KEY `idx_users_status` (`status`),
  ADD KEY `idx_users_name` (`last_name`,`first_name`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_id`,`role_id`),
  ADD KEY `idx_user_roles_role_id` (`role_id`),
  ADD KEY `idx_user_roles_assigned_by` (`assigned_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `analysis_insights`
--
ALTER TABLE `analysis_insights`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `analysis_jobs`
--
ALTER TABLE `analysis_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `analysis_metrics`
--
ALTER TABLE `analysis_metrics`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `charts`
--
ALTER TABLE `charts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chart_data_points`
--
ALTER TABLE `chart_data_points`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chart_data_series`
--
ALTER TABLE `chart_data_series`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chart_types`
--
ALTER TABLE `chart_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `cleaning_jobs`
--
ALTER TABLE `cleaning_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cleaning_job_steps`
--
ALTER TABLE `cleaning_job_steps`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `datasets`
--
ALTER TABLE `datasets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dataset_categories`
--
ALTER TABLE `dataset_categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `dataset_columns`
--
ALTER TABLE `dataset_columns`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dataset_files`
--
ALTER TABLE `dataset_files`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `job_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `prediction_jobs`
--
ALTER TABLE `prediction_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prediction_metrics`
--
ALTER TABLE `prediction_metrics`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prediction_outputs`
--
ALTER TABLE `prediction_outputs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `remember_tokens`
--
ALTER TABLE `remember_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_exports`
--
ALTER TABLE `report_exports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `report_types`
--
ALTER TABLE `report_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `analysis_insights`
--
ALTER TABLE `analysis_insights`
  ADD CONSTRAINT `fk_analysis_insights_analysis_job_id` FOREIGN KEY (`analysis_job_id`) REFERENCES `analysis_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `analysis_jobs`
--
ALTER TABLE `analysis_jobs`
  ADD CONSTRAINT `fk_analysis_jobs_cleaning_job_id` FOREIGN KEY (`cleaning_job_id`) REFERENCES `cleaning_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_analysis_jobs_dataset_id` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_analysis_jobs_initiated_by` FOREIGN KEY (`initiated_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `analysis_job_columns`
--
ALTER TABLE `analysis_job_columns`
  ADD CONSTRAINT `fk_analysis_job_columns_analysis_job_id` FOREIGN KEY (`analysis_job_id`) REFERENCES `analysis_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_analysis_job_columns_dataset_column_id` FOREIGN KEY (`dataset_column_id`) REFERENCES `dataset_columns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `analysis_metrics`
--
ALTER TABLE `analysis_metrics`
  ADD CONSTRAINT `fk_analysis_metrics_analysis_job_id` FOREIGN KEY (`analysis_job_id`) REFERENCES `analysis_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_analysis_metrics_dataset_column_id` FOREIGN KEY (`dataset_column_id`) REFERENCES `dataset_columns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `charts`
--
ALTER TABLE `charts`
  ADD CONSTRAINT `fk_charts_analysis_job_id` FOREIGN KEY (`analysis_job_id`) REFERENCES `analysis_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_charts_chart_type_id` FOREIGN KEY (`chart_type_id`) REFERENCES `chart_types` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_charts_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_charts_dataset_id` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `chart_data_points`
--
ALTER TABLE `chart_data_points`
  ADD CONSTRAINT `fk_chart_data_points_chart_data_series_id` FOREIGN KEY (`chart_data_series_id`) REFERENCES `chart_data_series` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `chart_data_series`
--
ALTER TABLE `chart_data_series`
  ADD CONSTRAINT `fk_chart_data_series_chart_id` FOREIGN KEY (`chart_id`) REFERENCES `charts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `cleaning_jobs`
--
ALTER TABLE `cleaning_jobs`
  ADD CONSTRAINT `fk_cleaning_jobs_dataset_id` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cleaning_jobs_initiated_by` FOREIGN KEY (`initiated_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cleaning_jobs_input_file_id` FOREIGN KEY (`input_file_id`) REFERENCES `dataset_files` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cleaning_jobs_output_file_id` FOREIGN KEY (`output_file_id`) REFERENCES `dataset_files` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `cleaning_job_columns`
--
ALTER TABLE `cleaning_job_columns`
  ADD CONSTRAINT `fk_cleaning_job_columns_cleaning_job_id` FOREIGN KEY (`cleaning_job_id`) REFERENCES `cleaning_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cleaning_job_columns_dataset_column_id` FOREIGN KEY (`dataset_column_id`) REFERENCES `dataset_columns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `cleaning_job_steps`
--
ALTER TABLE `cleaning_job_steps`
  ADD CONSTRAINT `fk_cleaning_job_steps_cleaning_job_id` FOREIGN KEY (`cleaning_job_id`) REFERENCES `cleaning_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `datasets`
--
ALTER TABLE `datasets`
  ADD CONSTRAINT `fk_datasets_category_id` FOREIGN KEY (`category_id`) REFERENCES `dataset_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_datasets_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_datasets_owner_user_id` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dataset_columns`
--
ALTER TABLE `dataset_columns`
  ADD CONSTRAINT `fk_dataset_columns_dataset_id` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dataset_column_stats`
--
ALTER TABLE `dataset_column_stats`
  ADD CONSTRAINT `fk_dataset_column_stats_dataset_column_id` FOREIGN KEY (`dataset_column_id`) REFERENCES `dataset_columns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `dataset_files`
--
ALTER TABLE `dataset_files`
  ADD CONSTRAINT `fk_dataset_files_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dataset_files_dataset_id` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `fk_password_resets_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `prediction_confusion_matrix`
--
ALTER TABLE `prediction_confusion_matrix`
  ADD CONSTRAINT `fk_prediction_confusion_matrix_prediction_job_id` FOREIGN KEY (`prediction_job_id`) REFERENCES `prediction_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `prediction_jobs`
--
ALTER TABLE `prediction_jobs`
  ADD CONSTRAINT `fk_prediction_jobs_cleaning_job_id` FOREIGN KEY (`cleaning_job_id`) REFERENCES `cleaning_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prediction_jobs_dataset_id` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prediction_jobs_initiated_by` FOREIGN KEY (`initiated_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prediction_jobs_target_column_id` FOREIGN KEY (`target_column_id`) REFERENCES `dataset_columns` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `prediction_job_columns`
--
ALTER TABLE `prediction_job_columns`
  ADD CONSTRAINT `fk_prediction_job_columns_dataset_column_id` FOREIGN KEY (`dataset_column_id`) REFERENCES `dataset_columns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prediction_job_columns_prediction_job_id` FOREIGN KEY (`prediction_job_id`) REFERENCES `prediction_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `prediction_metrics`
--
ALTER TABLE `prediction_metrics`
  ADD CONSTRAINT `fk_prediction_metrics_prediction_job_id` FOREIGN KEY (`prediction_job_id`) REFERENCES `prediction_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `prediction_outputs`
--
ALTER TABLE `prediction_outputs`
  ADD CONSTRAINT `fk_prediction_outputs_prediction_job_id` FOREIGN KEY (`prediction_job_id`) REFERENCES `prediction_jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `remember_tokens`
--
ALTER TABLE `remember_tokens`
  ADD CONSTRAINT `fk_remember_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `fk_reports_analysis_job_id` FOREIGN KEY (`analysis_job_id`) REFERENCES `analysis_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reports_chart_id` FOREIGN KEY (`chart_id`) REFERENCES `charts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reports_cleaning_job_id` FOREIGN KEY (`cleaning_job_id`) REFERENCES `cleaning_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reports_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reports_dataset_id` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reports_prediction_job_id` FOREIGN KEY (`prediction_job_id`) REFERENCES `prediction_jobs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reports_report_type_id` FOREIGN KEY (`report_type_id`) REFERENCES `report_types` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `report_exports`
--
ALTER TABLE `report_exports`
  ADD CONSTRAINT `fk_report_exports_report_id` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_role_permissions_permission_id` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_role_permissions_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD CONSTRAINT `fk_system_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_user_roles_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
