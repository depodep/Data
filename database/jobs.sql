USE data_science_hub;

CREATE TABLE IF NOT EXISTS jobs (
  job_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_type VARCHAR(100) NOT NULL,
  dataset_id INT UNSIGNED NULL,
  run_by_user_id INT UNSIGNED NULL,
  payload_json LONGTEXT NULL,
  result_json LONGTEXT NULL,
  status ENUM('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  priority INT NOT NULL DEFAULT 5,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (job_id),
  KEY idx_jobs_status (status),
  KEY idx_jobs_dataset_id (dataset_id),
  KEY idx_jobs_run_by_user_id (run_by_user_id)
);
