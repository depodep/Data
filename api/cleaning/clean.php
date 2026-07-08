<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

$user = current_user();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}

$datasetId = isset($_POST['dataset_id']) ? (int) $_POST['dataset_id'] : 0;
if ($datasetId <= 0) json_response(['success' => false, 'message' => 'Missing dataset_id'], 422);

$stmt = db()->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
$stmt->execute(['id' => $datasetId]);
$dataset = $stmt->fetch();
if ($dataset === false) json_response(['success' => false, 'message' => 'Dataset not found'], 404);

$uploadsDir = __DIR__ . '/../../uploads';
$cleanedDir = __DIR__ . '/../../cleaned';
$stored = $dataset['stored_filename'] ?? null;
$inputPath = $stored ? $uploadsDir . DIRECTORY_SEPARATOR . $stored : null;
if (empty($inputPath) || !is_file($inputPath)) json_response(['success' => false, 'message' => 'Stored CSV missing'], 500);

$safeInput = escapeshellarg(realpath($inputPath));
$outputName = pathinfo($stored, PATHINFO_FILENAME) . '_cleaned.csv';
$outputPath = $cleanedDir . DIRECTORY_SEPARATOR . $outputName;

$python = 'python';
$script = __DIR__ . '/../../python/clean_dataset.py';
$cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . $safeInput . ' ' . escapeshellarg($outputPath);

$raw = shell_exec($cmd);
if ($raw === null) json_response(['success' => false, 'message' => 'Failed to execute cleaning script'], 500);

$result = json_decode($raw, true);
if (!is_array($result) || empty($result['success'])) {
    json_response(['success' => false, 'message' => $result['message'] ?? 'Cleaning failed', 'details' => $result]);
}

// Update dataset status and cleaned_at
$update = db()->prepare('UPDATE datasets SET processing_status = :status, cleaned_at = NOW(), file_path = :clean_path, updated_at = NOW() WHERE dataset_id = :id');
$update->execute(['status' => 'cleaned', 'clean_path' => '/Data/cleaned/' . $outputName, 'id' => $datasetId]);

log_activity((int)$user['user_id'], 'clean', 'cleaning', 'Dataset cleaned via Python script', $result, $datasetId);

// Persist cleaning summary
try {
    $ins = db()->prepare('INSERT INTO cleaning_results (dataset_id, run_by_user_id, summary_json, removed_duplicates, created_at) VALUES (:dataset_id, :run_by_user_id, :summary_json, :removed_duplicates, NOW())');
    $ins->execute([
        'dataset_id' => $datasetId,
        'run_by_user_id' => (int)$user['user_id'],
        'summary_json' => json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'removed_duplicates' => isset($result['removed_duplicates']) ? (int)$result['removed_duplicates'] : 0,
    ]);
    $cleaningId = (int) db()->lastInsertId();
} catch (Throwable $ex) {
    $cleaningId = null;
}

json_response(['success' => true, 'message' => 'Cleaning completed', 'summary' => $result, 'cleaning_result_id' => $cleaningId]);
