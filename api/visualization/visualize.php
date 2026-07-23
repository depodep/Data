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

if (!can_current_user_view_dataset($dataset)) {
    json_response(['success' => false, 'message' => 'Access denied to this dataset'], 403);
}

$file = $dataset['file_path'] ?? null;
if (empty($file)) json_response(['success' => false, 'message' => 'Dataset file missing'], 500);

$abs = dataset_absolute_path((string) $file);
if ($abs === null || !is_file($abs)) json_response(['success' => false, 'message' => 'File not readable'], 500);

$chartsDir = __DIR__ . '/../../charts';
$outDir = $chartsDir . DIRECTORY_SEPARATOR . 'dataset_' . $datasetId;

$python = PYTHON_EXECUTABLE;
$script = __DIR__ . '/../../python/visualize_dataset.py';
$cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($abs) . ' ' . escapeshellarg($outDir);

$raw = shell_exec($cmd);
if ($raw === null) json_response(['success' => false, 'message' => 'Failed to execute visualization script'], 500);

$result = json_decode($raw, true);
if (!is_array($result) || empty($result['success'])) {
    json_response(['success' => false, 'message' => $result['message'] ?? 'Visualization failed', 'details' => $result]);
}

// Normalize paths for frontend
$charts = array_map(function($p) {
    $rel = str_replace('\\', '/', $p);
    // try to make web path
    $web = preg_replace('#^.+/htdocs/#', '/', $rel);
    return $web ?: $p;
}, $result['charts'] ?? []);

// Persist visualization result
try {
    $ins = db()->prepare('INSERT INTO visualization_results (dataset_id, run_by_user_id, chart_paths_json, created_at) VALUES (:dataset_id, :run_by_user_id, :chart_paths_json, NOW())');
    $ins->execute([
        'dataset_id' => $datasetId,
        'run_by_user_id' => (int) $user['user_id'],
        'chart_paths_json' => json_encode($charts, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    ]);
    $vizId = (int) db()->lastInsertId();
} catch (Throwable $ex) {
    $vizId = null;
}

json_response(['success' => true, 'charts' => $charts, 'visualization_result_id' => $vizId]);
