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

$stmt = db()->prepare('SELECT visualization_result_id, dataset_id, run_by_user_id, chart_paths_json, created_at FROM visualization_results WHERE dataset_id = :id ORDER BY created_at DESC');
$stmt->execute(['id' => $datasetId]);
$rows = $stmt->fetchAll();

// decode chart paths
foreach ($rows as &$r) {
    $r['chart_paths'] = json_decode($r['chart_paths_json'], true);
    unset($r['chart_paths_json']);
}

json_response(['success' => true, 'data' => $rows]);
