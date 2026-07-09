<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';
require_once __DIR__ . '/../../includes/datasets.php';

require_role(['administrator']);

function user_search_clause(string $query, string $roleSlug = ''): array
{
    $where = [];
    $params = [];

    if ($query !== '') {
        $where[] = '(u.full_name LIKE :search OR u.email LIKE :search OR COALESCE(u.student_id, "") LIKE :search OR COALESCE(u.employee_id, "") LIKE :search OR r.role_name LIKE :search)';
        $params['search'] = '%' . $query . '%';
    }

    if ($roleSlug !== '') {
        $where[] = 'r.role_slug = :role_slug';
        $params['role_slug'] = $roleSlug;
    }

    $sql = '';
    if ($where !== []) {
        $sql = ' WHERE ' . implode(' AND ', $where);
    }

    return [
        'sql' => $sql,
        'params' => $params,
    ];
}

function fetch_roles(): array
{
    $statement = db()->query('SELECT role_id, role_name, role_slug FROM roles WHERE is_active = 1 ORDER BY role_name ASC');

    return $statement->fetchAll();
}

function validate_user_input(array $payload, bool $isUpdate = false): array
{
    $errors = [];
    $fullName = trim((string) ($payload['full_name'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    $roleId = (int) ($payload['role_id'] ?? 0);
    $status = (string) ($payload['status'] ?? 'active');
    $studentId = trim((string) ($payload['student_id'] ?? ''));
    $employeeId = trim((string) ($payload['employee_id'] ?? ''));
    $phone = trim((string) ($payload['phone'] ?? ''));
    $password = (string) ($payload['password'] ?? '');

    if ($fullName === '') {
        $errors['full_name'] = 'Full name is required.';
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'A valid email is required.';
    }

    if ($roleId <= 0) {
        $errors['role_id'] = 'Role is required.';
    }

    if (!in_array($status, ['active', 'inactive', 'pending'], true)) {
        $errors['status'] = 'Invalid status.';
    }

    if (!$isUpdate && $password === '') {
        $errors['password'] = 'Password is required.';
    }

    if ($password !== '' && strlen($password) < 8) {
        $errors['password'] = 'Password must be at least 8 characters.';
    }

    return [
        'errors' => $errors,
        'data' => [
            'full_name' => $fullName,
            'email' => $email,
            'role_id' => $roleId,
            'status' => $status,
            'student_id' => $studentId !== '' ? $studentId : null,
            'employee_id' => $employeeId !== '' ? $employeeId : null,
            'phone' => $phone !== '' ? $phone : null,
            'password' => $password,
        ],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$payload = $method === 'GET' ? $_GET : request_payload();
$action = (string) ($payload['action'] ?? 'list');

if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $token = $payload['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);

    if (!verify_csrf_token(is_string($token) ? $token : null)) {
        json_response(['success' => false, 'message' => 'Invalid CSRF token.'], 419);
    }
}

if ($action === 'roles') {
    json_response(['success' => true, 'data' => fetch_roles()]);
}

if ($action === 'view') {
    $userId = (int) ($payload['id'] ?? 0);

    if ($userId <= 0) {
        json_response(['success' => false, 'message' => 'Invalid user id.'], 422);
    }

    $statement = db()->prepare(
        'SELECT u.user_id, u.role_id, u.student_id, u.employee_id, u.full_name, u.email, u.phone, u.avatar_path, u.status, u.last_login_at, u.created_at, u.updated_at, r.role_name, r.role_slug
         FROM users u
         INNER JOIN roles r ON r.role_id = u.role_id
         WHERE u.user_id = :user_id
         LIMIT 1'
    );
    $statement->execute(['user_id' => $userId]);
    $user = $statement->fetch();

    if ($user === false) {
        json_response(['success' => false, 'message' => 'User not found.'], 404);
    }

    json_response(['success' => true, 'data' => $user]);
}

if ($action === 'list') {
    $search = trim((string) ($payload['search'] ?? ''));
    $roleSlug = trim((string) ($payload['role'] ?? ''));
    $page = max(1, (int) ($payload['page'] ?? 1));
    $perPage = min(50, max(5, (int) ($payload['per_page'] ?? 10)));
    $offset = ($page - 1) * $perPage;

    $clause = user_search_clause($search, $roleSlug);

    $countStatement = db()->prepare(
        'SELECT COUNT(*) AS total
         FROM users u
         INNER JOIN roles r ON r.role_id = u.role_id' . $clause['sql']
    );
    $countStatement->execute($clause['params']);
    $total = (int) $countStatement->fetchColumn();

    $statement = db()->prepare(
        'SELECT u.user_id, u.role_id, u.student_id, u.employee_id, u.full_name, u.email, u.phone, u.avatar_path, u.status, u.last_login_at, u.created_at, u.updated_at, r.role_name, r.role_slug
         FROM users u
         INNER JOIN roles r ON r.role_id = u.role_id' . $clause['sql'] . '
         ORDER BY u.created_at DESC
         LIMIT :limit OFFSET :offset'
    );

    foreach ($clause['params'] as $key => $value) {
        $statement->bindValue(':' . $key, $value, PDO::PARAM_STR);
    }

    $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();

    json_response([
        'success' => true,
        'data' => $statement->fetchAll(),
        'meta' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => (int) max(1, (int) ceil($total / $perPage)),
        ],
    ]);
}

if ($action === 'create') {
    $validated = validate_user_input($payload, false);

    if ($validated['errors'] !== []) {
        json_response(['success' => false, 'message' => 'Validation failed.', 'errors' => $validated['errors']], 422);
    }

    $exists = db()->prepare('SELECT COUNT(*) FROM users WHERE email = :email OR (student_id IS NOT NULL AND student_id = :student_id) OR (employee_id IS NOT NULL AND employee_id = :employee_id)');
    $exists->execute([
        'email' => $validated['data']['email'],
        'student_id' => $validated['data']['student_id'],
        'employee_id' => $validated['data']['employee_id'],
    ]);

    if ((int) $exists->fetchColumn() > 0) {
        json_response(['success' => false, 'message' => 'Email, student ID, or employee ID already exists.'], 409);
    }

    $statement = db()->prepare(
        'INSERT INTO users (role_id, student_id, employee_id, full_name, email, password_hash, phone, status, created_at, updated_at)
         VALUES (:role_id, :student_id, :employee_id, :full_name, :email, :password_hash, :phone, :status, NOW(), NOW())'
    );
    $statement->execute([
        'role_id' => $validated['data']['role_id'],
        'student_id' => $validated['data']['student_id'],
        'employee_id' => $validated['data']['employee_id'],
        'full_name' => $validated['data']['full_name'],
        'email' => $validated['data']['email'],
        'password_hash' => password_hash($validated['data']['password'], PASSWORD_DEFAULT),
        'phone' => $validated['data']['phone'],
        'status' => $validated['data']['status'],
    ]);

    log_activity((int) current_user()['user_id'], 'create', 'user_management', 'Created a user account.', ['email' => $validated['data']['email'], 'role_id' => $validated['data']['role_id']], null, null, 'user', (int) db()->lastInsertId());

    json_response(['success' => true, 'message' => 'User created successfully.']);
}

if ($action === 'update') {
    $userId = (int) ($payload['id'] ?? 0);

    if ($userId <= 0) {
        json_response(['success' => false, 'message' => 'Invalid user id.'], 422);
    }

    $validated = validate_user_input($payload, true);

    if ($validated['errors'] !== []) {
        json_response(['success' => false, 'message' => 'Validation failed.', 'errors' => $validated['errors']], 422);
    }

    $statement = db()->prepare('SELECT user_id FROM users WHERE user_id = :user_id LIMIT 1');
    $statement->execute(['user_id' => $userId]);

    if ($statement->fetchColumn() === false) {
        json_response(['success' => false, 'message' => 'User not found.'], 404);
    }

    $duplicate = db()->prepare(
        'SELECT COUNT(*) FROM users WHERE user_id <> :user_id AND (email = :email OR (student_id IS NOT NULL AND student_id = :student_id) OR (employee_id IS NOT NULL AND employee_id = :employee_id))'
    );
    $duplicate->execute([
        'user_id' => $userId,
        'email' => $validated['data']['email'],
        'student_id' => $validated['data']['student_id'],
        'employee_id' => $validated['data']['employee_id'],
    ]);

    if ((int) $duplicate->fetchColumn() > 0) {
        json_response(['success' => false, 'message' => 'Email, student ID, or employee ID already exists.'], 409);
    }

    $query = 'UPDATE users
              SET role_id = :role_id,
                  student_id = :student_id,
                  employee_id = :employee_id,
                  full_name = :full_name,
                  email = :email,
                  phone = :phone,
                  status = :status,
                  updated_at = NOW()';

    $params = [
        'user_id' => $userId,
        'role_id' => $validated['data']['role_id'],
        'student_id' => $validated['data']['student_id'],
        'employee_id' => $validated['data']['employee_id'],
        'full_name' => $validated['data']['full_name'],
        'email' => $validated['data']['email'],
        'phone' => $validated['data']['phone'],
        'status' => $validated['data']['status'],
    ];

    if ($validated['data']['password'] !== '') {
        $query .= ', password_hash = :password_hash';
        $params['password_hash'] = password_hash($validated['data']['password'], PASSWORD_DEFAULT);
    }

    $query .= ' WHERE user_id = :user_id';

    $statement = db()->prepare($query);
    $statement->execute($params);

    log_activity((int) current_user()['user_id'], 'update', 'user_management', 'Updated a user account.', ['user_id' => $userId, 'email' => $validated['data']['email'], 'role_id' => $validated['data']['role_id']], null, null, 'user', $userId);

    json_response(['success' => true, 'message' => 'User updated successfully.']);
}

if ($action === 'delete') {
    $userId = (int) ($payload['id'] ?? 0);

    if ($userId <= 0) {
        json_response(['success' => false, 'message' => 'Invalid user id.'], 422);
    }

    $statement = db()->prepare('DELETE FROM users WHERE user_id = :user_id');
    $statement->execute(['user_id' => $userId]);

    log_activity((int) current_user()['user_id'], 'delete', 'user_management', 'Deleted a user account.', ['user_id' => $userId], null, null, 'user', $userId);

    json_response(['success' => true, 'message' => 'User deleted successfully.']);
}

json_response(['success' => false, 'message' => 'Unknown action.'], 400);
