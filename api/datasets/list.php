<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$user = current_user();

$search = trim((string) ($_GET['search'] ?? ''));
$status = trim((string) ($_GET['status'] ?? ''));
$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(50, max(5, (int) ($_GET['per_page'] ?? 10)));
$offset = ($page - 1) * $perPage;

$where = '';
$params = [];

// Role-based visibility
if (user_has_role(['administrator'])) {
    // no extra where
} else {
    $where = 'WHERE d.owner_user_id = :uid';
    $params['uid'] = $user['user_id'];
}

if (!empty($_GET['my_datasets'])) {
    $where .= ($where === '' ? 'WHERE ' : ' AND ') . 'd.owner_user_id = :my_uid';
    $params['my_uid'] = $user['user_id'];
}

if ($search !== '') {
    $where .= ($where === '' ? 'WHERE ' : ' AND ') . '(d.dataset_name LIKE :search OR d.source_filename LIKE :search)';
    $params['search'] = '%' . $search . '%';
}

if ($status !== '') {
    $where .= ($where === '' ? 'WHERE ' : ' AND ') . 'd.processing_status = :status';
    $params['status'] = $status;
}

$countSql = 'SELECT COUNT(*) FROM datasets d ' . $where;
$stmt = db()->prepare($countSql);
$stmt->execute($params);
$total = (int) $stmt->fetchColumn();

$sql = 'SELECT d.dataset_id, d.dataset_name, d.dataset_description, d.owner_user_id, u.full_name AS owner_name, d.source_filename, d.file_path, d.file_size, d.record_count, d.column_count, d.processing_status, d.uploaded_at FROM datasets d LEFT JOIN users u ON u.user_id = d.owner_user_id ' . $where . ' ORDER BY d.uploaded_at DESC LIMIT :limit OFFSET :offset';

$stmt = db()->prepare($sql);
foreach ($params as $k => $v) {
    $stmt->bindValue(':' . $k, $v, PDO::PARAM_STR);
}
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll();

json_response([
    'success' => true,
    'data' => $rows,
    'meta' => [
        'page' => $page,
        'per_page' => $perPage,
        'total' => $total,
        'total_pages' => (int) max(1, ceil($total / $perPage)),
        'user_role' => $user['role_slug'] ?? '',
    ],
]);
