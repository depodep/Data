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
    <title>Student Registration | <?php echo e(APP_NAME); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="/Data/assets/css/app.css" rel="stylesheet">
</head>
<body class="app-auth-shell">
    <main class="container py-5">
        <div class="row justify-content-center align-items-center min-vh-100">
            <div class="col-12 col-md-8 col-lg-6">
                <div class="card shadow-lg border-0 app-card">
                    <div class="card-body p-4 p-md-5">
                        <div class="mb-4 text-center">
                            <div class="app-brand-icon mb-3"><i class="fa-solid fa-user-graduate"></i></div>
                            <h1 class="h3 mb-2">Student Registration</h1>
                            <p class="text-muted mb-0">Create your student account to view only the datasets linked to your Student ID.</p>
                        </div>

                        <div id="loginAlert" class="alert d-none" role="alert"></div>

                        <form id="studentRegisterForm" novalidate>
                            <input type="hidden" name="csrf_token" value="<?php echo e($csrfToken); ?>">
                            <div class="mb-3">
                                <label for="student_id" class="form-label">Student ID</label>
                                <input type="text" class="form-control form-control-lg" id="student_id" name="student_id" required autocomplete="username">
                            </div>
                            <div class="mb-3">
                                <label for="full_name" class="form-label">Full Name</label>
                                <input type="text" class="form-control form-control-lg" id="full_name" name="full_name" required autocomplete="name">
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label">Email</label>
                                <input type="email" class="form-control form-control-lg" id="email" name="email" required autocomplete="email">
                            </div>
                            <div class="mb-3">
                                <label for="password" class="form-label">Password</label>
                                <input type="password" class="form-control form-control-lg" id="password" name="password" required autocomplete="new-password">
                            </div>
                            <div class="mb-4">
                                <label for="confirm_password" class="form-label">Confirm Password</label>
                                <input type="password" class="form-control form-control-lg" id="confirm_password" name="confirm_password" required autocomplete="new-password">
                            </div>
                            <button type="submit" class="btn btn-primary btn-lg w-100">Register</button>
                            <div class="text-center mt-3">
                                <a href="/Data/pages/auth/login.php" class="small text-decoration-none">Already have an account? Sign in</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/Data/assets/js/auth.js"></script>
</body>
</html>
