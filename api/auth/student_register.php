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
$fullName = trim((string) ($payload['full_name'] ?? ''));
$email = trim((string) ($payload['email'] ?? ''));
$password = (string) ($payload['password'] ?? '');
$confirmPassword = (string) ($payload['confirm_password'] ?? '');

if ($studentId === '' || $email === '' || $password === '') {
    json_response(['success' => false, 'message' => 'Student ID, email, and password are required.'], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['success' => false, 'message' => 'Enter a valid email address.'], 422);
}

if (strlen($password) < 8) {
    json_response(['success' => false, 'message' => 'Password must be at least 8 characters long.'], 422);
}

if ($password !== $confirmPassword) {
    json_response(['success' => false, 'message' => 'Passwords do not match.'], 422);
}

$recordStmt = db()->prepare('SELECT student_name FROM dataset_records WHERE student_id = :student_id ORDER BY dataset_id ASC LIMIT 1');
$recordStmt->execute(['student_id' => $studentId]);
$record = $recordStmt->fetch();

if ($record === false) {
    json_response(['success' => false, 'message' => 'This Student ID is not linked to any uploaded dataset.'], 404);
}

$existingStmt = db()->prepare('SELECT COUNT(*) FROM users WHERE student_id = :student_id OR email = :email');
$existingStmt->execute([
    'student_id' => $studentId,
    'email' => $email,
]);

if ((int) $existingStmt->fetchColumn() > 0) {
    json_response(['success' => false, 'message' => 'A student account with this Student ID or email already exists.'], 409);
}

$roleStmt = db()->prepare('SELECT role_id FROM roles WHERE role_slug = :role_slug LIMIT 1');
$roleStmt->execute(['role_slug' => 'student']);
$roleId = $roleStmt->fetchColumn();

if ($roleId === false) {
    $createRole = db()->prepare('INSERT INTO roles (role_name, role_slug, description, is_active, created_at, updated_at) VALUES (:role_name, :role_slug, :description, 1, NOW(), NOW())');
    $createRole->execute([
        'role_name' => 'Student',
        'role_slug' => 'student',
        'description' => 'Student account role',
    ]);
    $roleId = (int) db()->lastInsertId();
}

$resolvedName = $fullName !== '' ? $fullName : (string) ($record['student_name'] ?? ('Student ' . $studentId));

$insert = db()->prepare('INSERT INTO users (role_id, student_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (:role_id, :student_id, :full_name, :email, :password_hash, :status, NOW(), NOW())');
$insert->execute([
    'role_id' => (int) $roleId,
    'student_id' => $studentId,
    'full_name' => $resolvedName,
    'email' => $email,
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    'status' => 'active',
]);

$userId = (int) db()->lastInsertId();
$userStmt = db()->prepare('SELECT u.user_id, u.role_id, u.student_id, u.employee_id, u.full_name, u.email, u.status, r.role_name, r.role_slug FROM users u INNER JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = :user_id LIMIT 1');
$userStmt->execute(['user_id' => $userId]);
$user = $userStmt->fetch();

if ($user === false) {
    json_response(['success' => false, 'message' => 'Student account was created but could not be loaded.'], 500);
}

login_user($user);
log_activity($userId, 'register', 'authentication', 'Student account registered.', ['student_id' => $studentId, 'email' => $email]);

json_response(['success' => true, 'message' => 'Registration successful.', 'user' => $user]);
