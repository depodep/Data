<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

require_login();

$user = current_user();

$stats = [];

// Total users (admin only)
if (user_has_role(['administrator'])) {
    $stmt = db()->query('SELECT COUNT(*) FROM users');
    $stats['total_users'] = (int) $stmt->fetchColumn();
} else {
    $stats['total_users'] = null;
}

$stmt = db()->prepare('SELECT COUNT(*) FROM datasets');
$stmt->execute();
$stats['total_datasets'] = (int) $stmt->fetchColumn();

$stmt = db()->prepare('SELECT COUNT(*) FROM dataset_records');
$stmt->execute();
$stats['total_records'] = (int) $stmt->fetchColumn();

// Recent datasets
$stmt = db()->prepare('SELECT d.dataset_id, d.dataset_name, d.owner_user_id, u.full_name AS owner_name, d.record_count, d.uploaded_at FROM datasets d LEFT JOIN users u ON u.user_id = d.owner_user_id ORDER BY d.uploaded_at DESC LIMIT 6');
$stmt->execute();
$recentDatasets = $stmt->fetchAll();

// Recent activities
$stmt = db()->prepare('SELECT a.activity_log_id, a.user_id, u.full_name AS user_name, a.activity_type, a.module_name, a.description, a.created_at FROM activity_logs a LEFT JOIN users u ON u.user_id = a.user_id ORDER BY a.created_at DESC LIMIT 8');
$stmt->execute();
$recentActivities = $stmt->fetchAll();

json_response([
    'success' => true,
    'data' => [
        'stats' => $stats,
        'recent_datasets' => $recentDatasets,
        'recent_activities' => $recentActivities,
    ],
]);
