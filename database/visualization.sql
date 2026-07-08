USE data_science_hub;

CREATE TABLE IF NOT EXISTS visualization_results (
  visualization_result_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dataset_id INT UNSIGNED NOT NULL,
  run_by_user_id INT UNSIGNED NULL,
  chart_paths_json LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (visualization_result_id),
  KEY idx_visualization_results_dataset_id (dataset_id),
  CONSTRAINT fk_visualization_results_dataset FOREIGN KEY (dataset_id) REFERENCES datasets (dataset_id) ON DELETE CASCADE ON UPDATE CASCADE
);
