<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$datasetId = isset($_GET['dataset_id']) ? (int) $_GET['dataset_id'] : 0;
$limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 10;

if ($datasetId <= 0) {
    json_response(['success' => false, 'message' => 'Missing dataset_id'], 422);
}

$stmt = db()->prepare('SELECT d.*, u.full_name AS owner_name FROM datasets d LEFT JOIN users u ON u.user_id = d.owner_user_id WHERE d.dataset_id = :dataset_id LIMIT 1');
$stmt->execute(['dataset_id' => $datasetId]);
$dataset = $stmt->fetch();

if ($dataset === false) {
    json_response(['success' => false, 'message' => 'Dataset not found'], 404);
}

// If dataset_records exist, return from DB
$countStmt = db()->prepare('SELECT COUNT(*) FROM dataset_records WHERE dataset_id = :dataset_id');
$countStmt->execute(['dataset_id' => $datasetId]);
$recordCount = (int) $countStmt->fetchColumn();

if ($recordCount > 0) {
    $rowsStmt = db()->prepare('SELECT row_number, student_id, student_name, course, year_level, section, subject, quiz_score, midterm_score, final_score, attendance, is_valid, validation_notes FROM dataset_records WHERE dataset_id = :dataset_id ORDER BY row_number ASC LIMIT :limit');
    $rowsStmt->bindValue(':dataset_id', $datasetId, PDO::PARAM_INT);
    $rowsStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $rowsStmt->execute();
    $rows = $rowsStmt->fetchAll();

    json_response([
        'success' => true,
        'source' => 'records',
        'columns' => ['row_number','student_id','student_name','course','year_level','section','subject','quiz_score','midterm_score','final_score','attendance','is_valid','validation_notes'],
        'rows' => $rows,
        'total_rows' => $recordCount,
    ]);
}

// Fallback: read from stored CSV file
$uploadsDir = __DIR__ . '/../../uploads';
$stored = $dataset['stored_filename'] ?? null;
$filePath = $stored ? $uploadsDir . DIRECTORY_SEPARATOR . $stored : null;

if (empty($filePath) || !is_file($filePath) || !is_readable($filePath)) {
    json_response(['success' => false, 'message' => 'Stored CSV missing or unreadable'], 500);
}

$handle = fopen($filePath, 'r');
if ($handle === false) {
    json_response(['success' => false, 'message' => 'Failed to open CSV file'], 500);
}

$header = fgetcsv($handle);
if ($header === false) {
    fclose($handle);
    json_response(['success' => false, 'message' => 'CSV header missing'], 422);
}

$header = array_map('trim', $header);
$rows = [];
$i = 0;
while ($i < $limit && ($row = fgetcsv($handle)) !== false) {
    $rows[] = array_combine($header, array_map('trim', $row));
    $i++;
}

fclose($handle);

json_response([
    'success' => true,
    'source' => 'csv',
    'columns' => $header,
    'rows' => $rows,
    'total_rows' => (int) $dataset['record_count'],
]);
