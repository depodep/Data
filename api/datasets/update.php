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
$name = trim((string) ($_POST['dataset_name'] ?? ''));
$description = trim((string) ($_POST['dataset_description'] ?? ''));

if (empty($name)) {
    json_response(['success' => false, 'message' => 'Dataset name is required.'], 400);
}

$stmt = db()->prepare('SELECT * FROM datasets WHERE dataset_id = :id');
$stmt->execute(['id' => $datasetId]);
$dataset = $stmt->fetch();

if (!$dataset) {
    json_response(['success' => false, 'message' => 'Dataset not found.'], 404);
}

if ($user['role_slug'] !== 'administrator' && $dataset['owner_user_id'] !== $user['user_id']) {
    json_response(['success' => false, 'message' => 'Permission denied.'], 403);
}

$updateStmt = db()->prepare('UPDATE datasets SET dataset_name = :name, dataset_description = :description, updated_at = NOW() WHERE dataset_id = :id');
$updateStmt->execute([
    'name' => $name,
    'description' => $description,
    'id' => $datasetId
]);

json_response(['success' => true, 'message' => 'Dataset updated successfully.']);
