<?php
declare(strict_types=1);

function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    if (!empty($_SESSION['user'])) {
        return $_SESSION['user'];
    }

    $statement = db()->prepare(
        'SELECT u.user_id, u.role_id, u.student_id, u.employee_id, u.full_name, u.email, u.status, r.role_name, r.role_slug
         FROM users u
         INNER JOIN roles r ON r.role_id = u.role_id
         WHERE u.user_id = :user_id
         LIMIT 1'
    );
    $statement->execute(['user_id' => (int) $_SESSION['user_id']]);
    $user = $statement->fetch();

    if ($user === false) {
        logout_user();

        return null;
    }

    $_SESSION['user'] = $user;

    return $user;
}

function is_authenticated(): bool
{
    return current_user() !== null;
}

function user_has_role(array $roleSlugs): bool
{
    $user = current_user();

    if ($user === null) {
        return false;
    }

    return in_array($user['role_slug'], $roleSlugs, true);
}

function require_login(): void
{
    if (!is_authenticated()) {
        if (str_contains($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
            json_response(['success' => false, 'message' => 'Authentication required.'], 401);
        }

        redirect('/Data/pages/auth/login.php');
    }
}

function require_role(array $roleSlugs): void
{
    require_login();

    if (!user_has_role($roleSlugs)) {
        if (str_contains($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
            json_response(['success' => false, 'message' => 'Access denied.'], 403);
        }

        http_response_code(403);
        echo 'Access denied.';
        exit;
    }
}

function login_user(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['user_id'];
    $_SESSION['user'] = $user;
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function logout_user(): void
{
    $user = current_user();
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }

    if (is_array($user)) {
        log_activity((int) $user['user_id'], 'logout', 'authentication', 'User logged out.', ['email' => $user['email'] ?? null]);
    }
}

function attempt_login(string $email, string $password): array
{
    $statement = db()->prepare(
        'SELECT u.user_id, u.role_id, u.student_id, u.employee_id, u.full_name, u.email, u.password_hash, u.status, r.role_name, r.role_slug
         FROM users u
         INNER JOIN roles r ON r.role_id = u.role_id
         WHERE u.email = :email
         LIMIT 1'
    );
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();

    if ($user === false || $user['status'] !== 'active' || !password_verify($password, $user['password_hash'])) {
        return ['success' => false, 'message' => 'Invalid email or password.'];
    }

    unset($user['password_hash']);

    $update = db()->prepare('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = :user_id');
    $update->execute(['user_id' => (int) $user['user_id']]);

    login_user($user);
    log_activity((int) $user['user_id'], 'login', 'authentication', 'User logged in.', ['email' => $user['email']]);

    return [
        'success' => true,
        'message' => 'Login successful.',
        'user' => $user,
    ];
}
