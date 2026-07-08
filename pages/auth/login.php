<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

if (is_authenticated()) {
    redirect('/Data/pages/dashboard/index.php');
}

$csrfToken = csrf_token();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e($csrfToken); ?>">
    <title>Login | <?php echo e(APP_NAME); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="/Data/assets/css/app.css" rel="stylesheet">
</head>
<body class="app-auth-shell">
    <main class="container py-5">
        <div class="row justify-content-center align-items-center min-vh-100">
            <div class="col-12 col-md-8 col-lg-5">
                <div class="card shadow-lg border-0 app-card">
                    <div class="card-body p-4 p-md-5">
                        <div class="mb-4 text-center">
                            <div class="app-brand-icon mb-3"><i class="fa-solid fa-graduation-cap"></i></div>
                            <h1 class="h3 mb-2"><?php echo e(APP_NAME); ?></h1>
                            <p class="text-muted mb-0">Sign in to manage academic data.</p>
                        </div>

                                                <div id="loginAlert" class="alert d-none" role="alert"></div>

                                                <ul class="nav nav-tabs mb-3" id="loginTabs" role="tablist">
                                                    <li class="nav-item" role="presentation">
                                                        <button class="nav-link active" id="email-tab" data-bs-toggle="tab" data-bs-target="#email-login" type="button" role="tab">Admin/Teacher</button>
                                                    </li>
                                                    <li class="nav-item" role="presentation">
                                                        <button class="nav-link" id="student-tab" data-bs-toggle="tab" data-bs-target="#student-login" type="button" role="tab">Student</button>
                                                    </li>
                                                </ul>

                                                <div class="tab-content">
                                                    <div class="tab-pane fade show active" id="email-login" role="tabpanel">
                                                        <form id="loginForm" novalidate>
                                                                <input type="hidden" name="csrf_token" value="<?php echo e($csrfToken); ?>">
                                                                <div class="mb-3">
                                                                        <label for="email" class="form-label">Email</label>
                                                                        <input type="email" class="form-control form-control-lg" id="email" name="email" required autocomplete="email">
                                                                </div>
                                                                <div class="mb-4">
                                                                        <label for="password" class="form-label">Password</label>
                                                                        <input type="password" class="form-control form-control-lg" id="password" name="password" required autocomplete="current-password">
                                                                </div>
                                                                <button type="submit" class="btn btn-primary btn-lg w-100">Login</button>
                                                        </form>
                                                    </div>

                                                    <div class="tab-pane fade" id="student-login" role="tabpanel">
                                                        <form id="studentLoginForm" novalidate>
                                                            <input type="hidden" name="csrf_token" value="<?php echo e($csrfToken); ?>">
                                                            <div class="mb-3">
                                                                <label for="student_id" class="form-label">Student ID</label>
                                                                <input type="text" class="form-control form-control-lg" id="student_id" name="student_id" required autocomplete="username">
                                                            </div>
                                                            <div class="mb-3">
                                                                <label for="student_password" class="form-label">Password</label>
                                                                <input type="password" class="form-control form-control-lg" id="student_password" name="password" placeholder="Leave blank to use Student ID">
                                                            </div>
                                                            <button type="submit" class="btn btn-secondary btn-lg w-100">Student Login</button>
                                                        </form>
                                                    </div>
                                                </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/Data/assets/js/auth.js"></script>
</body>
</html>

