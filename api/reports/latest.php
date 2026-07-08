<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$user = current_user();
$datasetId = isset($_GET['dataset_id']) ? (int) $_GET['dataset_id'] : null;

// If admin, return latest report per user (optionally scoped to dataset)
if (!empty($user['role_slug']) && $user['role_slug'] === 'administrator') {
    if ($datasetId) {
        $sub = db()->prepare('SELECT generated_by_user_id, MAX(generated_at) as maxt FROM reports WHERE dataset_id = :dataset_id GROUP BY generated_by_user_id');
        $sub->execute(['dataset_id' => $datasetId]);
    } else {
        $sub = db()->prepare('SELECT generated_by_user_id, MAX(generated_at) as maxt FROM reports GROUP BY generated_by_user_id');
        $sub->execute();
    }
    $pairs = $sub->fetchAll();

    $results = [];
    foreach ($pairs as $p) {
        $stmt = db()->prepare('SELECT report_id, dataset_id, analysis_result_id, prediction_result_id, generated_by_user_id, report_type, report_title, report_format, file_name, file_path, generated_at FROM reports WHERE generated_by_user_id = :uid AND generated_at = :gdt LIMIT 1');
        $stmt->execute(['uid' => $p['generated_by_user_id'], 'gdt' => $p['maxt']]);
        $row = $stmt->fetch();
        if ($row) $results[] = $row;
    }

    json_response(['success' => true, 'data' => $results]);
}

// Non-admin: return this user's latest reports
$stmt = db()->prepare('SELECT report_id, dataset_id, analysis_result_id, prediction_result_id, generated_by_user_id, report_type, report_title, report_format, file_name, file_path, generated_at FROM reports WHERE generated_by_user_id = :uid' . ($datasetId ? ' AND dataset_id = :dataset_id' : '') . ' ORDER BY generated_at DESC LIMIT 50');
$params = ['uid' => (int) $user['user_id']];
if ($datasetId) $params['dataset_id'] = $datasetId;
$stmt->execute($params);
$rows = $stmt->fetchAll();

json_response(['success' => true, 'data' => $rows]);
