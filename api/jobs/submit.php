<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator','teacher']);

$user = current_user();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}

$body = request_payload();
$jobType = trim((string) ($body['job_type'] ?? ''));
$datasetId = isset($body['dataset_id']) ? (int) $body['dataset_id'] : null;
$payload = $body['payload'] ?? null;

if ($jobType === '') json_response(['success' => false, 'message' => 'Missing job_type'], 422);

$stmt = db()->prepare('INSERT INTO jobs (job_type, dataset_id, run_by_user_id, payload_json, status, created_at, updated_at) VALUES (:job_type, :dataset_id, :run_by_user_id, :payload_json, :status, NOW(), NOW())');
$stmt->execute([
    'job_type' => $jobType,
    'dataset_id' => $datasetId,
    'run_by_user_id' => $user['user_id'],
    'payload_json' => $payload === null ? null : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    'status' => 'pending',
]);

$id = (int) db()->lastInsertId();
log_activity((int)$user['user_id'], 'job.create', 'jobs', 'Created background job', ['job_type' => $jobType, 'job_id' => $id], $datasetId);

json_response(['success' => true, 'job_id' => $id]);
