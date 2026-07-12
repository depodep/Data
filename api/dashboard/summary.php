<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$user = current_user();
$isAdministrator = $user !== null && ($user['role_slug'] ?? '') === 'administrator';
$userId = (int) ($user['user_id'] ?? 0);

$datasetWhere = $isAdministrator ? '' : 'WHERE d.owner_user_id = :user_id';
$activityWhere = $isAdministrator ? '' : 'WHERE a.user_id = :user_id';

$datasetCount = db()->prepare('SELECT COUNT(*) FROM datasets d ' . $datasetWhere);
if (!$isAdministrator) {
    $datasetCount->execute(['user_id' => $userId]);
} else {
    $datasetCount->execute();
}

$recordCount = db()->prepare('SELECT COALESCE(SUM(d.record_count), 0) FROM datasets d ' . $datasetWhere);
if (!$isAdministrator) {
    $recordCount->execute(['user_id' => $userId]);
} else {
    $recordCount->execute();
}

$statusCounts = db()->prepare(
    'SELECT d.processing_status, COUNT(*) AS total
     FROM datasets d ' . $datasetWhere . '
     GROUP BY d.processing_status'
);
if (!$isAdministrator) {
    $statusCounts->execute(['user_id' => $userId]);
} else {
    $statusCounts->execute();
}

$recentDatasets = db()->prepare(
    'SELECT d.dataset_id, d.dataset_name, d.processing_status, d.record_count, d.uploaded_at, d.file_type, u.full_name AS owner_name
     FROM datasets d
     INNER JOIN users u ON u.user_id = d.owner_user_id
     ' . $datasetWhere . '
     ORDER BY d.uploaded_at DESC
     LIMIT 5'
);
if (!$isAdministrator) {
    $recentDatasets->execute(['user_id' => $userId]);
} else {
    $recentDatasets->execute();
}

$recentActivities = db()->prepare(
    'SELECT a.activity_type, a.module_name, a.description, a.created_at, u.full_name AS actor_name
     FROM activity_logs a
     LEFT JOIN users u ON u.user_id = a.user_id
     ' . $activityWhere . '
     ORDER BY a.created_at DESC
     LIMIT 8'
);
if (!$isAdministrator) {
    $recentActivities->execute(['user_id' => $userId]);
} else {
    $recentActivities->execute();
}

json_response([
    'success' => true,
    'data' => [
        'stats' => [
            'dataset_count' => (int) $datasetCount->fetchColumn(),
            'record_count' => (int) $recordCount->fetchColumn(),
            'activity_count' => (int) db()->query('SELECT COUNT(*) FROM activity_logs ' . ($isAdministrator ? '' : 'WHERE user_id = ' . $userId))->fetchColumn(),
            'status_breakdown' => $statusCounts->fetchAll(),
        ],
        'recent_datasets' => $recentDatasets->fetchAll(),
        'recent_activities' => $recentActivities->fetchAll(),
    ],
]);
