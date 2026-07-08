USE data_science_hub;

ALTER TABLE prediction_results
  ADD COLUMN model_path VARCHAR(255) NULL AFTER predictions_json,
  ADD COLUMN predictions_path VARCHAR(255) NULL AFTER model_path;
