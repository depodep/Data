<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$jobId = isset($_GET['job_id']) ? (int) $_GET['job_id'] : 0;
if ($jobId <= 0) json_response(['success' => false, 'message' => 'Missing job_id'], 422);

$stmt = db()->prepare('SELECT job_id, job_type, dataset_id, run_by_user_id, status, payload_json, result_json, started_at, completed_at, created_at, updated_at FROM jobs WHERE job_id = :id LIMIT 1');
$stmt->execute(['id' => $jobId]);
$job = $stmt->fetch();
if ($job === false) json_response(['success' => false, 'message' => 'Job not found'], 404);

json_response(['success' => true, 'job' => $job]);
