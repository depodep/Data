USE data_science_hub;

CREATE TABLE IF NOT EXISTS cleaning_results (
  cleaning_result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dataset_id INT UNSIGNED NOT NULL,
  run_by_user_id INT UNSIGNED NOT NULL,
  summary_json LONGTEXT NOT NULL,
  removed_duplicates INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cleaning_result_id),
  KEY idx_cleaning_results_dataset_id (dataset_id),
  KEY idx_cleaning_results_run_by_user_id (run_by_user_id),
  CONSTRAINT fk_cleaning_results_dataset FOREIGN KEY (dataset_id) REFERENCES datasets (dataset_id) ON DELETE CASCADE ON UPDATE CASCADE
);
