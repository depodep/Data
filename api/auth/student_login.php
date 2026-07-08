<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}

// Accept optional password: if provided, attempt normal login via email/password
$studentId = trim((string) ($_POST['student_id'] ?? ''));
$password = isset($_POST['password']) ? (string) $_POST['password'] : '';
if ($studentId === '') json_response(['success' => false, 'message' => 'Missing student_id'], 422);

// If a password was provided, attempt standard email/password login for the student
if ($password !== '') {
    $email = $studentId . '@students.local';
    $res = attempt_login($email, $password);
    if ($res['success']) {
        json_response($res);
    }
    // if attempt_login failed, continue to create-or-login fallback which will create the user
}
// require at least one dataset record for this student to allow login
$stmt = db()->prepare('SELECT * FROM dataset_records WHERE student_id = :sid LIMIT 1');
$stmt->execute(['sid' => $studentId]);
$rec = $stmt->fetch();

if ($rec === false) {
    json_response(['success' => false, 'message' => 'No records found for this student'], 404);
}

$fullName = $rec['student_name'] ?? ('Student ' . $studentId);

// find or create a user for this student
$uStmt = db()->prepare('SELECT * FROM users WHERE student_id = :sid LIMIT 1');
$uStmt->execute(['sid' => $studentId]);
$user = $uStmt->fetch();

// find student role id
$rStmt = db()->prepare('SELECT role_id FROM roles WHERE role_slug = :slug LIMIT 1');
$rStmt->execute(['slug' => 'student']);
$role = $rStmt->fetchColumn();
if ($role === false) {
    // create student role
    $insr = db()->prepare('INSERT INTO roles (role_name, role_slug, description, is_active, created_at, updated_at) VALUES (:name, :slug, :desc, 1, NOW(), NOW())');
    $insr->execute(['name' => 'Student', 'slug' => 'student', 'desc' => 'Auto-created student role']);
    $role = (int) db()->lastInsertId();
}

if ($user === false) {
    // create a user with email as sid@students.local and password = studentId
    $email = $studentId . '@students.local';
    // default password equals student id unless a different password was provided
    $initialPassword = $password !== '' ? $password : $studentId;
    $pw = password_hash($initialPassword, PASSWORD_DEFAULT);
    $ins = db()->prepare('INSERT INTO users (role_id, student_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (:role_id, :student_id, :full_name, :email, :password_hash, :status, NOW(), NOW())');
    $ins->execute([
        'role_id' => $role,
        'student_id' => $studentId,
        'full_name' => $fullName,
        'email' => $email,
        'password_hash' => $pw,
        'status' => 'active'
    ]);
    $uid = (int) db()->lastInsertId();
    $uStmt = db()->prepare('SELECT * FROM users WHERE user_id = :id LIMIT 1');
    $uStmt->execute(['id' => $uid]);
    $user = $uStmt->fetch();
}

// login the user
if ($user) {
    // remove sensitive fields
    unset($user['password_hash']);
    login_user($user);
    log_activity((int)$user['user_id'], 'login', 'authentication', 'Student logged in via student_id');
    json_response(['success' => true, 'message' => 'Login successful', 'user' => $user]);
}

json_response(['success' => false, 'message' => 'Unable to create or login student user'], 500);
