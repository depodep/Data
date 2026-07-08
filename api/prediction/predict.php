<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

$user = current_user();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success' => false, 'message' => 'Method not allowed'], 405);

$datasetId = isset($_POST['dataset_id']) ? (int) $_POST['dataset_id'] : 0;
$target = trim((string) ($_POST['target_column'] ?? ''));
$modelType = trim((string) ($_POST['model_type'] ?? 'linear_regression'));
$featureColumns = $_POST['feature_columns'] ?? [];
$sync = isset($_POST['sync']) && in_array((string)$_POST['sync'], ['1','true'], true);

if ($datasetId <= 0 || $target === '') json_response(['success' => false, 'message' => 'Missing dataset_id or target_column'], 422);

$stmt = db()->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
$stmt->execute(['id' => $datasetId]);
$dataset = $stmt->fetch();
if ($dataset === false) json_response(['success' => false, 'message' => 'Dataset not found'], 404);

// Check visibility
if (!can_current_user_view_dataset($dataset)) {
    json_response(['success' => false, 'message' => 'Access denied to this dataset'], 403);
}

if ($sync) {
    // Run synchronously (legacy behavior)
    $file = $dataset['file_path'] ?? null;
    if (empty($file)) json_response(['success' => false, 'message' => 'Dataset file missing'], 500);

    $abs = realpath(__DIR__ . '/../../' . ltrim($file, '/\\'));
    if ($abs === false || !is_file($abs)) json_response(['success' => false, 'message' => 'File not readable'], 500);

    $outDir = __DIR__ . '/../../models/predictions';
    if (!is_dir($outDir)) mkdir($outDir, 0755, true);
    $outPath = $outDir . DIRECTORY_SEPARATOR . pathinfo($abs, PATHINFO_FILENAME) . '_' . $target . '_predictions.csv';

    $python = 'python';
    $script = __DIR__ . '/../../python/predict_dataset.py';
    $cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($abs) . ' ' . escapeshellarg($target) . ' ' . escapeshellarg($outPath);

    $raw = shell_exec($cmd);
    if ($raw === null) json_response(['success' => false, 'message' => 'Failed to execute prediction script'], 500);

    $result = json_decode($raw, true);
    if (!is_array($result) || empty($result['success'])) {
        json_response(['success' => false, 'message' => $result['message'] ?? 'Prediction failed', 'details' => $result]);
    }

    // Store prediction result (sync)
    $ins = db()->prepare('INSERT INTO prediction_results (dataset_id, run_by_user_id, model_type, target_column, feature_columns_json, training_rows, testing_rows, accuracy, metrics_json, predictions_json, status, started_at, completed_at, created_at, updated_at) VALUES (:dataset_id, :run_by_user_id, :model_type, :target_column, :feature_columns_json, :training_rows, :testing_rows, :accuracy, :metrics_json, :predictions_json, :status, NOW(), NOW(), NOW(), NOW())');

    $metrics = ['mse' => $result['mse'] ?? null, 'r2' => $result['r2'] ?? null];
    $predJson = json_encode(['predictions_path' => $result['predictions_path'] ?? $outPath]);

    $ins->execute([
        'dataset_id' => $datasetId,
        'run_by_user_id' => (int)$user['user_id'],
        'model_type' => $modelType,
        'target_column' => $target,
        'feature_columns_json' => json_encode($featureColumns ?: []),
        'training_rows' => $result['training_rows'] ?? 0,
        'testing_rows' => $result['testing_rows'] ?? 0,
        'accuracy' => $result['r2'] ?? null,
        'metrics_json' => json_encode($metrics),
        'predictions_json' => $predJson,
        'status' => 'completed'
    ]);

    log_activity((int)$user['user_id'], 'predict', 'prediction', 'Ran prediction on dataset (sync)', $result, $datasetId);

    json_response(['success' => true, 'result' => $result]);

} else {
    // enqueue job
    $payload = ['target' => $target, 'model_type' => $modelType, 'feature_columns' => $featureColumns];
    $stmt = db()->prepare('INSERT INTO jobs (job_type, dataset_id, run_by_user_id, payload_json, status, created_at, updated_at) VALUES (:job_type, :dataset_id, :run_by_user_id, :payload_json, :status, NOW(), NOW())');
    $stmt->execute([
        'job_type' => 'predict',
        'dataset_id' => $datasetId,
        'run_by_user_id' => (int)$user['user_id'],
        'payload_json' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'status' => 'pending',
    ]);

    $jobId = (int) db()->lastInsertId();
    log_activity((int)$user['user_id'], 'job.create', 'prediction', 'Enqueued prediction job', ['job_id' => $jobId, 'target' => $target], $datasetId);

    json_response(['success' => true, 'job_id' => $jobId]);
}
