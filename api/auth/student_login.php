<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}

$payload = request_payload();
$token = $payload['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);

if (!verify_csrf_token(is_string($token) ? $token : null)) {
    json_response(['success' => false, 'message' => 'Invalid CSRF token.'], 419);
}

$studentId = trim((string) ($payload['student_id'] ?? ''));
$password = (string) ($payload['password'] ?? '');
if ($studentId === '' || $password === '') {
    json_response(['success' => false, 'message' => 'Student ID and password are required.'], 422);
}

$stmt = db()->prepare(
    'SELECT u.user_id, u.role_id, u.student_id, u.employee_id, u.full_name, u.email, u.password_hash, u.status, r.role_name, r.role_slug
     FROM users u
     INNER JOIN roles r ON r.role_id = u.role_id
     WHERE u.student_id = :student_id AND r.role_slug = :role_slug
     LIMIT 1'
);
$stmt->execute([
    'student_id' => $studentId,
    'role_slug' => 'student',
]);
$user = $stmt->fetch();

if ($user === false || $user['status'] !== 'active' || !password_verify($password, $user['password_hash'])) {
    json_response(['success' => false, 'message' => 'Invalid student ID or password. Please register first if you do not have an account.'], 401);
}

unset($user['password_hash']);

$update = db()->prepare('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = :user_id');
$update->execute(['user_id' => (int) $user['user_id']]);

login_user($user);
log_activity((int) $user['user_id'], 'login', 'authentication', 'Student logged in via student ID.');

json_response(['success' => true, 'message' => 'Login successful', 'user' => $user]);
