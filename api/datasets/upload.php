<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

$user = current_user();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method not allowed.'], 405);
}

$token = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
if (!verify_csrf_token(is_string($token) ? $token : null)) {
    json_response(['success' => false, 'message' => 'Invalid CSRF token.'], 419);
}

if (empty($_FILES['dataset']) && empty($_POST['stored'])) {
    json_response(['success' => false, 'message' => 'No file uploaded.'], 422);
}

$file = $_FILES['dataset'] ?? null;

if ($file !== null && $file['error'] !== UPLOAD_ERR_OK) {
    json_response(['success' => false, 'message' => 'Upload error code: ' . $file['error']], 400);
}

$allowed = ['text/csv', 'text/plain', 'application/vnd.ms-excel', 'text/comma-separated-values'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if ($ext !== 'csv') {
    json_response(['success' => false, 'message' => 'Only CSV uploads are supported. For Excel use the backend PhpSpreadsheet integration.'], 415);
}

// move file to uploads with unique name
$uploadsDir = __DIR__ . '/../../uploads';
if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

$unique = bin2hex(random_bytes(12));
$storedName = $unique . '_' . basename($file['name']);
$destination = $uploadsDir . DIRECTORY_SEPARATOR . $storedName;

if (!empty($_POST['stored']) && empty($_FILES['dataset'])) {
    // Using previously uploaded stored filename for follow-up actions (preview/clean)
    $storedName = basename((string) $_POST['stored']);
    $destination = $uploadsDir . DIRECTORY_SEPARATOR . $storedName;
    if (!file_exists($destination)) {
        json_response(['success' => false, 'message' => 'Stored file not found.'], 404);
    }
} else {
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        json_response(['success' => false, 'message' => 'Failed to move uploaded file.'], 500);
    }
}

// Validate header matches exactly the required template
$required = ['Student ID','Student Name','Course','Year Level','Section','Subject','Quiz Score','Midterm Score','Final Score','Attendance'];

if (($handle = fopen($destination, 'r')) === false) {
    unlink($destination);
    json_response(['success' => false, 'message' => 'Failed to open uploaded file.'], 500);
}

$header = fgetcsv($handle);
fclose($handle);

if ($header === false) {
    unlink($destination);
    json_response(['success' => false, 'message' => 'CSV header not found or empty.'], 422);
}

// Trim header values
$header = array_map('trim', $header);

if ($header !== $required) {
    unlink($destination);
    json_response(['success' => false, 'message' => 'CSV template mismatch. Required columns: ' . implode(', ', $required)], 422);
}

// Support preview and cleaning modes
$mode = $_POST['mode'] ?? '';

// helper to read N rows (excluding header), returned as associative arrays
$read_rows = function (string $path, int $limit = 10) {
    $out = [];
    if (($h = fopen($path, 'r')) === false) return ['header' => [], 'rows' => []];
    $hdr = fgetcsv($h);
    $count = 0;
    while (($row = fgetcsv($h)) !== false && $count < $limit) {
        if (is_array($hdr) && count($hdr) === count($row)) {
            $out[] = array_combine($hdr, $row);
        } else {
            $out[] = $row;
        }
        $count++;
    }
    fclose($h);
    return ['header' => $hdr ?: [], 'rows' => $out];
};

if ($mode === 'preview') {
    $preview = $read_rows($destination, 10);
    json_response([
        'success' => true,
        'rows' => $preview['rows'],
        'header' => $preview['header'],
        'stored' => $storedName,
    ]);
}

if ($mode === 'clean') {
    // run cleaning script and return cleaned preview
    $cleanedName = 'cleaned_' . $storedName;
    $cleanedPath = $uploadsDir . DIRECTORY_SEPARATOR . $cleanedName;
    $script = __DIR__ . '/../../python/clean_dataset.py';
    $options = [];
    if (!empty($_POST['remove_duplicates'])) {
        $options['remove_duplicates'] = filter_var($_POST['remove_duplicates'], FILTER_VALIDATE_BOOLEAN);
    }
    if (!empty($_POST['missing_strategy'])) {
        $options['missing_strategy'] = $_POST['missing_strategy'];
    }
    $encodedOptions = json_encode($options, JSON_UNESCAPED_UNICODE);
    $cmd = escapeshellcmd(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg($destination) . ' ' . escapeshellarg($cleanedPath) . ' ' . escapeshellarg($encodedOptions);
    // attempt to run
    $raw = null; $out = null; $exit = 0;
    @exec($cmd . ' 2>&1', $out, $exit);

    if ($exit !== 0 || !file_exists($cleanedPath)) {
        json_response(['success' => false, 'message' => 'Cleaning failed', 'details' => $out], 500);
    }

    $preview = $read_rows($cleanedPath, 10);
    json_response(['success' => true, 'preview' => $preview, 'cleaned' => $cleanedName, 'stored' => $storedName]);
}

// Finalize: count rows and insert, prefer cleaned file if exists
$finalPath = $destination;
$cleanCandidate = $uploadsDir . DIRECTORY_SEPARATOR . 'cleaned_' . $storedName;
if (file_exists($cleanCandidate)) {
    $finalPath = $cleanCandidate;
    $finalStored = 'cleaned_' . $storedName;
} else {
    $finalStored = $storedName;
}

// Count rows (excluding header)
$rows = 0;
if (($handle = fopen($finalPath, 'r')) !== false) {
    fgetcsv($handle);
    while (fgetcsv($handle) !== false) $rows++;
    fclose($handle);
}

// Insert dataset metadata (shared_scope kept default private)
$stmt = db()->prepare('INSERT INTO datasets (owner_user_id, dataset_name, dataset_description, source_filename, stored_filename, file_path, file_size, file_type, record_count, column_count, shared_scope, processing_status, upload_hash, uploaded_at, created_at, updated_at) VALUES (:owner_user_id, :dataset_name, :dataset_description, :source_filename, :stored_filename, :file_path, :file_size, :file_type, :record_count, :column_count, :shared_scope, :processing_status, :upload_hash, NOW(), NOW(), NOW())');

// determine original filename and size
$datasetName = trim((string) ($_POST['dataset_name'] ?? ''));
$description = trim((string) ($_POST['description'] ?? ''));
$sharedScope = 'private';
$uploadHash = hash('sha256', $unique . microtime(true));

if (empty($datasetName)) {
    if ($file !== null && !empty($file['name'])) {
        $datasetName = pathinfo($file['name'], PATHINFO_FILENAME);
    } else {
        $datasetName = pathinfo($finalStored, PATHINFO_FILENAME);
    }
}

if ($file !== null) {
    $sourceFilename = $file['name'];
    $fileType = $file['type'] ?? 'text/csv';
    $fileSize = (int) $file['size'];
} else {
    $sourceFilename = preg_replace('/^[0-9a-f]+_/', '', $finalStored);
    $fileType = 'text/csv';
    $fileSize = (int) filesize($finalPath);
}

$stmt->execute([
    'owner_user_id' => $user['user_id'],
    'dataset_name' => $datasetName,
    'dataset_description' => $description,
    'source_filename' => $sourceFilename,
    'stored_filename' => $finalStored,
    'file_path' => '/Data/uploads/' . $finalStored,
    'file_size' => $fileSize,
    'file_type' => $fileType,
    'record_count' => $rows,
    'column_count' => count($header),
    'shared_scope' => $sharedScope,
    'processing_status' => 'uploaded',
    'upload_hash' => $uploadHash,
]);

json_response(['success' => true, 'message' => 'Dataset uploaded and validated.', 'rows' => $rows]);
