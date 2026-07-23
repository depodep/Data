<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$datasetId = isset($_GET['dataset_id']) ? (int) $_GET['dataset_id'] : 0;
$limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 10;
if ($datasetId <= 0) json_response(['success' => false, 'message' => 'Missing dataset_id'], 422);

$stmt = db()->prepare('SELECT * FROM datasets WHERE dataset_id = :id LIMIT 1');
$stmt->execute(['id' => $datasetId]);
$dataset = $stmt->fetch();
if ($dataset === false) json_response(['success' => false, 'message' => 'Dataset not found'], 404);

$uploadsDir = __DIR__ . '/../../uploads';
$stored = $dataset['stored_filename'] ?? null;
$inputPath = $stored ? $uploadsDir . DIRECTORY_SEPARATOR . $stored : null;
if (empty($inputPath) || !is_file($inputPath)) json_response(['success' => false, 'message' => 'Stored CSV missing'], 500);

$previewDir = __DIR__ . '/../../cleaned/previews';
if (!is_dir($previewDir)) mkdir($previewDir, 0755, true);
$outName = pathinfo($stored, PATHINFO_FILENAME) . '_preview_' . bin2hex(random_bytes(6)) . '.csv';
$outPath = $previewDir . DIRECTORY_SEPARATOR . $outName;

$options = [];
if (!empty($_GET['remove_duplicates'])) $options['remove_duplicates'] = filter_var($_GET['remove_duplicates'], FILTER_VALIDATE_BOOLEAN);
if (!empty($_GET['missing_strategy'])) $options['missing_strategy'] = $_GET['missing_strategy'];

$python = PYTHON_EXECUTABLE;
$script = __DIR__ . '/../../python/clean_dataset.py';
$cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg(realpath($inputPath)) . ' ' . escapeshellarg($outPath) . ' ' . escapeshellarg(json_encode($options));

$raw = shell_exec($cmd);
if ($raw === null) json_response(['success' => false, 'message' => 'Failed to run cleaner'], 500);

$result = json_decode($raw, true) ?: null;
if ($result === null || empty($result['success'])) {
    json_response(['success' => false, 'message' => $result['message'] ?? 'Cleaner failed', 'details' => $result], 500);
}

// return first N rows from outPath
if (!is_file($outPath)) json_response(['success' => false, 'message' => 'Preview file not found'], 500);

$rows = [];
if (($h = fopen($outPath, 'r')) !== false) {
    $header = fgetcsv($h);
    $count = 0;
    while ($count < $limit && ($r = fgetcsv($h)) !== false) {
        $rows[] = array_combine($header, array_map('trim', $r));
        $count++;
    }
    fclose($h);
}

json_response(['success' => true, 'rows' => $rows, 'summary' => $result]);
