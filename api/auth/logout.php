<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method not allowed.'], 405);
}

$payload = request_payload();
$token = $payload['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);

if (!verify_csrf_token(is_string($token) ? $token : null)) {
    json_response(['success' => false, 'message' => 'Invalid CSRF token.'], 419);
}

logout_user();

json_response(['success' => true, 'message' => 'Logged out successfully.']);
