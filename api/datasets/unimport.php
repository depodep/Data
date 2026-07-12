<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

// Only administrators can un-import
require_role(['administrator']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method not allowed.'], 405);
}

$token = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
if (!verify_csrf_token(is_string($token) ? $token : null)) {
    json_response(['success' => false, 'message' => 'Invalid CSRF token.'], 419);
}

$datasetId = (int) ($_POST['dataset_id'] ?? 0);

$stmt = db()->prepare('SELECT dataset_id, processing_status FROM datasets WHERE dataset_id = :id FOR UPDATE');
$stmt->execute(['id' => $datasetId]);
$dataset = $stmt->fetch();

if (!$dataset) {
    json_response(['success' => false, 'message' => 'Dataset not found.'], 404);
}

if ($dataset['processing_status'] !== 'validated') {
    json_response(['success' => false, 'message' => 'Dataset is not currently imported.'], 400);
}

try {
    db()->beginTransaction();

    // Remove all records from the database
    $deleteStmt = db()->prepare('DELETE FROM dataset_records WHERE dataset_id = :id');
    $deleteStmt->execute(['id' => $datasetId]);

    // Update processing status back to uploaded
    $updateStmt = db()->prepare("UPDATE datasets SET processing_status = 'uploaded', updated_at = NOW() WHERE dataset_id = :id");
    $updateStmt->execute(['id' => $datasetId]);

    db()->commit();

    json_response([
        'success' => true,
        'message' => 'Records removed from database successfully.',
    ]);
} catch (Throwable $e) {
    db()->rollBack();
    error_log('Unimport error: ' . $e->getMessage());
    json_response(['success' => false, 'message' => 'Failed to remove records from database.'], 500);
}
