<?php
require_once __DIR__ . '/../includes/bootstrap.php';

try {
    $stmt = db()->query("SHOW COLUMNS FROM users");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($cols, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Throwable $ex) {
    echo json_encode(['error' => $ex->getMessage()]);
}
