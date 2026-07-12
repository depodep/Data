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

$datasetId = (int) ($_POST['dataset_id'] ?? 0);

$stmt = db()->prepare('SELECT * FROM datasets WHERE dataset_id = :id');
$stmt->execute(['id' => $datasetId]);
$dataset = $stmt->fetch();

if (!$dataset) {
    json_response(['success' => false, 'message' => 'Dataset not found.'], 404);
}

if ($user['role_slug'] !== 'administrator' && $dataset['owner_user_id'] !== $user['user_id']) {
    json_response(['success' => false, 'message' => 'Permission denied.'], 403);
}

// Optional: remove physical file
if (!empty($dataset['file_path']) && file_exists($dataset['file_path'])) {
    @unlink($dataset['file_path']);
}

$deleteStmt = db()->prepare('DELETE FROM datasets WHERE dataset_id = :id');
$deleteStmt->execute(['id' => $datasetId]);

json_response(['success' => true, 'message' => 'Dataset removed successfully.']);
