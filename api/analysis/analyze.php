<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

$user = current_user();

$datasetId = isset($_GET['dataset_id']) ? (int) $_GET['dataset_id'] : 0;
if ($datasetId <= 0) json_response(['success' => false, 'message' => 'Missing dataset_id'], 422);

$stmt = db()->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
$stmt->execute(['id' => $datasetId]);
$dataset = $stmt->fetch();
if ($dataset === false) json_response(['success' => false, 'message' => 'Dataset not found'], 404);

// Check visibility
if (!can_current_user_view_dataset($dataset)) {
    json_response(['success' => false, 'message' => 'Access denied to this dataset'], 403);
}

$file = $dataset['file_path'] ?? null;
if (empty($file)) json_response(['success' => false, 'message' => 'Dataset file missing'], 500);

$abs = dataset_absolute_path((string) $file);
if ($abs === null || !is_file($abs)) json_response(['success' => false, 'message' => 'File not readable'], 500);

$python = PYTHON_EXECUTABLE;
$script = __DIR__ . '/../../python/analyze_dataset.py';
$cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($abs);

$raw = shell_exec($cmd);
if ($raw === null) json_response(['success' => false, 'message' => 'Failed to execute analysis script'], 500);

$result = json_decode($raw, true);
if (!is_array($result) || empty($result['success'])) {
    json_response(['success' => false, 'message' => $result['message'] ?? 'Analysis failed', 'details' => $result]);
}

// Persist analysis result
try {
    $ins = db()->prepare('INSERT INTO analysis_results (dataset_id, run_by_user_id, analysis_mode, status, result_summary, metrics_json, insights_json, started_at, completed_at, created_at, updated_at) VALUES (:dataset_id, :run_by_user_id, :analysis_mode, :status, :result_summary, :metrics_json, :insights_json, NOW(), NOW(), NOW(), NOW())');
    $ins->execute([
        'dataset_id' => $datasetId,
        'run_by_user_id' => (int) $user['user_id'],
        'analysis_mode' => 'descriptive',
        'status' => 'completed',
        'result_summary' => null,
        'metrics_json' => json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'insights_json' => null,
    ]);
    $analysisId = (int) db()->lastInsertId();
} catch (Throwable $ex) {
    $analysisId = null;
}

log_activity((int)$user['user_id'], 'analyze', 'analysis', 'Ran analysis on dataset', $result, $datasetId);

json_response(['success' => true, 'analysis' => $result, 'analysis_result_id' => $analysisId]);
