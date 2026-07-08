<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$user = current_user();
$csrfToken = csrf_token();
$displayName = $user['full_name'] ?? 'User';
$roleName = $user['role_name'] ?? 'Member';
$isAdministrator = ($user['role_slug'] ?? '') === 'administrator';
$isTeacher = ($user['role_slug'] ?? '') === 'teacher';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e($csrfToken); ?>">
    <title>Dashboard | <?php echo e(APP_NAME); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="/Data/assets/css/app.css" rel="stylesheet">
</head>
<body class="app-dashboard-shell">
    <nav class="navbar navbar-expand-lg navbar-dark app-navbar px-3">
        <a class="navbar-brand fw-semibold" href="/Data/pages/dashboard/index.php"><?php echo e(APP_NAME); ?></a>
        <div class="ms-auto d-flex gap-2 flex-wrap">
            <a class="btn btn-outline-light btn-sm" href="/Data/pages/dashboard/index.php">Dashboard</a>
            <?php if ($isAdministrator): ?>
                <a class="btn btn-outline-light btn-sm" href="/Data/pages/admin/users/index.php">Users</a>
            <?php endif; ?>
            <?php if ($isAdministrator || $isTeacher): ?>
                <a class="btn btn-outline-light btn-sm" href="/Data/pages/datasets/index.php">Dataset Library</a>
            <?php endif; ?>
            <a class="btn btn-outline-light btn-sm" href="/Data/pages/auth/logout.php">Logout</a>
        </div>
    </nav>

    <main class="container-fluid py-4">
        <div class="row g-4 mb-2">
            <div class="col-12 col-xl-8">
                <div class="dashboard-hero card border-0 shadow-sm">
                    <div class="card-body p-4 p-md-5">
                        <p class="text-uppercase text-info fw-semibold small mb-2">Overview</p>
                        <h1 class="display-6 fw-bold mb-2">Welcome back, <?php echo e($displayName); ?></h1>
                        <p class="lead text-muted mb-0">Role: <?php echo e($roleName); ?>. Monitor datasets, review recent activity, and jump into the library.</p>
                    </div>
                </div>
            </div>
            <div class="col-12 col-xl-4">
                <div class="card border-0 shadow-sm h-100 quick-actions-card">
                    <div class="card-body p-4">
                        <h2 class="h5 mb-3">Quick Actions</h2>
                        <div class="d-grid gap-2">
                            <?php if ($isAdministrator): ?>
                                <a class="btn btn-primary" href="/Data/pages/admin/users/index.php"><i class="fa-solid fa-users me-2"></i>Manage Users</a>
                            <?php endif; ?>
                            <?php if ($isAdministrator || $isTeacher): ?>
                                <a class="btn btn-outline-primary" href="/Data/pages/datasets/index.php"><i class="fa-solid fa-database me-2"></i>Open Dataset Library</a>
                            <?php endif; ?>
                            <a class="btn btn-outline-secondary" href="/Data/pages/auth/logout.php"><i class="fa-solid fa-right-from-bracket me-2"></i>Logout</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-4">
            <div class="col-12">
                <div class="row g-3" id="dashboardStats">
                    <div class="col-12 col-md-4">
                        <div class="stat-card card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="stat-icon bg-primary-subtle text-primary"><i class="fa-solid fa-database"></i></div>
                                <div class="stat-value" id="statDatasetCount">0</div>
                                <div class="stat-label">Datasets</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="stat-card card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="stat-icon bg-success-subtle text-success"><i class="fa-solid fa-table"></i></div>
                                <div class="stat-value" id="statRecordCount">0</div>
                                <div class="stat-label">Dataset Records</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="stat-card card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="stat-icon bg-warning-subtle text-warning"><i class="fa-solid fa-bolt"></i></div>
                                <div class="stat-value" id="statActivityCount">0</div>
                                <div class="stat-label">Activities</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-xl-7">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-transparent border-0 pt-4 px-4">
                        <h2 class="h5 mb-0">Recent Datasets</h2>
                    </div>
                    <div class="card-body pt-0 px-4 pb-4">
                        <div class="table-responsive">
                            <table class="table align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Owner</th>
                                        <th>Status</th>
                                        <th>Scope</th>
                                        <th>Records</th>
                                    </tr>
                                </thead>
                                <tbody id="recentDatasetsBody">
                                    <tr><td colspan="5" class="text-muted py-4 text-center">Loading datasets...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-xl-5">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-transparent border-0 pt-4 px-4">
                        <h2 class="h5 mb-0">Recent Activities</h2>
                    </div>
                    <div class="card-body pt-0 px-4 pb-4">
                        <div class="activity-list" id="recentActivitiesList">
                            <div class="text-muted py-4 text-center">Loading activities...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="/Data/assets/js/dashboard.js"></script>
</body>
</html>
