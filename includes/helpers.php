<?php
declare(strict_types=1);

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function redirect(string $path): never
{
    header('Location: ' . $path);
    exit;
}

function json_response(array $payload, int $statusCode = 200): never
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function dataset_absolute_path(string $storedPath): ?string
{
    $normalized = str_replace('\\', '/', trim($storedPath));
    if ($normalized === '') {
        return null;
    }

    if (str_starts_with($normalized, '/Data/')) {
        $normalized = substr($normalized, 6);
    } elseif (str_starts_with($normalized, 'Data/')) {
        $normalized = substr($normalized, 5);
    }

    $normalized = ltrim($normalized, '/');
    $candidate = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $normalized);
    $absolute = realpath($candidate);

    return $absolute !== false ? $absolute : null;
}

function request_payload(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw ?: '', true);

        return is_array($decoded) ? $decoded : [];
    }

    return array_merge($_GET, $_POST);
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return (string) $_SESSION['csrf_token'];
}

function verify_csrf_token(?string $token): bool
{
    return is_string($token) && isset($_SESSION['csrf_token']) && hash_equals((string) $_SESSION['csrf_token'], $token);
}

function log_activity(?int $userId, string $activityType, string $moduleName, string $description, array $metadata = [], ?int $datasetId = null, ?int $reportId = null, ?string $entityType = null, ?int $entityId = null): bool
{
    try {
        $statement = db()->prepare(
            'INSERT INTO activity_logs (user_id, dataset_id, report_id, activity_type, module_name, entity_type, entity_id, description, ip_address, user_agent, metadata_json, created_at)
             VALUES (:user_id, :dataset_id, :report_id, :activity_type, :module_name, :entity_type, :entity_id, :description, :ip_address, :user_agent, :metadata_json, NOW())'
        );
        return $statement->execute([
            'user_id' => $userId,
            'dataset_id' => $datasetId,
            'report_id' => $reportId,
            'activity_type' => $activityType,
            'module_name' => $moduleName,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255) ?: null,
            'metadata_json' => $metadata === [] ? null : json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    } catch (Throwable) {
        return false;
    }
}

function can_current_user_view_dataset(array $dataset): bool
{
    $user = current_user();

    if ($user === null) {
        return false;
    }

    if (!empty($user['role_slug']) && $user['role_slug'] === 'administrator') {
        return true;
    }

    return isset($dataset['owner_user_id']) && (int) $dataset['owner_user_id'] === (int) $user['user_id'];
}
