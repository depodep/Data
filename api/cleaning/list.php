<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$datasetId = isset($_GET['dataset_id']) ? (int) $_GET['dataset_id'] : 0;
if ($datasetId <= 0) json_response(['success' => false, 'message' => 'Missing dataset_id'], 422);

$stmt = db()->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
$stmt->execute(['id' => $datasetId]);
$dataset = $stmt->fetch();
if ($dataset === false) json_response(['success' => false, 'message' => 'Dataset not found'], 404);

if (!can_current_user_view_dataset($dataset)) {
	json_response(['success' => false, 'message' => 'Access denied to this dataset'], 403);
}

$stmt = db()->prepare('SELECT cleaning_result_id, dataset_id, run_by_user_id, removed_duplicates, summary_json, created_at FROM cleaning_results WHERE dataset_id = :id ORDER BY created_at DESC');
$stmt->execute(['id' => $datasetId]);
$rows = $stmt->fetchAll();

json_response(['success' => true, 'data' => $rows]);
