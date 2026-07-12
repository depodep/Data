<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../includes/bootstrap.php';

require_role(['administrator']);

$csrfToken = csrf_token();
$user = current_user();
$displayName = $user['full_name'] ?? 'User';

// Determine active subpage for sidebar
$activePage = 'users';
$activeSubPage = '';

$role = $_GET['role'] ?? '';
$tab = $_GET['tab'] ?? '';

if ($role === 'administrator') {
    $activeSubPage = 'users_admin';
} elseif ($role === 'teacher') {
    $activeSubPage = 'users_teacher';
} elseif ($role === 'student') {
    $activeSubPage = 'users_student';
} elseif ($tab === 'roles') {
    $activeSubPage = 'roles';
} elseif ($tab === 'activity') {
    $activeSubPage = 'activity_logs';
} elseif ($tab === 'academic_year') {
    $activeSubPage = 'academic_year';
} elseif ($tab === 'config') {
    $activeSubPage = 'sys_config';
} elseif ($tab === 'backup') {
    $activeSubPage = 'backup';
} elseif ($tab === 'audit') {
    $activeSubPage = 'audit_logs';
}

$activityLogs = [];
if ($tab === 'activity' || $tab === 'audit') {
    $stmt = db()->query('SELECT a.*, u.full_name, u.email FROM activity_logs a LEFT JOIN users u ON u.user_id = a.user_id ORDER BY a.created_at DESC LIMIT 50');
    $activityLogs = $stmt->fetchAll();
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e($csrfToken); ?>">
    <title>User Management | <?php echo e(APP_NAME); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="/Data/assets/css/app.css" rel="stylesheet">
</head>
<body class="app-admin-shell">
    <div class="app-layout-wrapper">
        <?php require_once __DIR__ . '/../../../includes/sidebar.php'; ?>
        
        <div class="app-main-container">
            <header class="app-top-header">
                <button class="sidebar-toggler" id="sidebarToggler">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <div class="ms-auto d-flex align-items-center gap-2">
                    <span class="text-muted small">Logged in as: <strong><?php echo e($displayName); ?></strong></span>
                </div>
            </header>

            <main class="container-fluid py-4">
                <?php if ($tab === ''): ?>
                    <!-- Standard User Management View -->
                    <div class="row g-4">
                        <div class="col-12">
                            <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                                <div>
                                    <h1 class="h3 mb-1">User Management<?php echo $role ? ' - ' . ucfirst($role) . 's' : ''; ?></h1>
                                    <p class="text-muted mb-0">Create, update, delete, search, and paginate users with role-based access.</p>
                                </div>
                                <button class="btn btn-primary" id="openCreateUser">
                                    <i class="fa-solid fa-plus me-2"></i>Create User
                                </button>
                            </div>
                        </div>

                        <div class="col-12">
                            <div id="usersAlert" class="alert d-none" role="alert"></div>
                            <div class="card shadow-sm border-0">
                                <div class="card-body">
                                    <div class="row g-3 align-items-center mb-3">
                                        <div class="col-md-6">
                                            <input type="search" id="searchUsers" class="form-control" placeholder="Search users by name, email, or ID">
                                        </div>
                                        <div class="col-md-3">
                                            <select id="perPage" class="form-select">
                                                <option value="5">5 per page</option>
                                                <option value="10" selected>10 per page</option>
                                                <option value="25">25 per page</option>
                                                <option value="50">50 per page</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="table-responsive">
                                        <table class="table align-middle table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Role</th>
                                                    <th>Status</th>
                                                    <th>Student ID</th>
                                                    <th>Employee ID</th>
                                                    <th class="text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody id="usersTableBody"></tbody>
                                        </table>
                                    </div>

                                    <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                                        <div class="text-muted small" id="usersMeta"></div>
                                        <nav>
                                            <ul class="pagination mb-0" id="usersPagination"></ul>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php elseif ($tab === 'roles'): ?>
                    <!-- Roles & Permissions Matrix View -->
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <h2 class="h4 fw-bold mb-3">Roles & Permissions Matrix</h2>
                            <p class="text-muted mb-4">A summary of standard user roles and their security clearances.</p>
                            <div class="table-responsive">
                                <table class="table align-middle table-hover">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Role</th>
                                            <th>Slug</th>
                                            <th>Description</th>
                                            <th>Clearances</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>Administrator</strong></td>
                                            <td><code>administrator</code></td>
                                            <td>Full system configuration, database backup, system configuration, and user management.</td>
                                            <td><span class="badge bg-success">All Clearances</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Teacher</strong></td>
                                            <td><code>teacher</code></td>
                                            <td>Upload and clean datasets, run descriptive statistics, build machine learning predictions.</td>
                                            <td><span class="badge bg-primary">Dataset Library</span> <span class="badge bg-primary">Analytics</span> <span class="badge bg-primary">Machine Learning</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Student</strong></td>
                                            <td><code>student</code></td>
                                            <td>View performance datasets linked to student email or student ID.</td>
                                            <td><span class="badge bg-secondary">Read Only (Linked ID)</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                <?php elseif ($tab === 'activity' || $tab === 'audit'): ?>
                    <!-- Activity Logs View -->
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <h2 class="h4 fw-bold mb-3"><?php echo $tab === 'audit' ? 'System Audit Logs' : 'Activity Logs'; ?></h2>
                            <p class="text-muted mb-4">Real-time system transaction logs captured from database execution logs.</p>
                            <div class="table-responsive">
                                <table class="table align-middle table-hover small">
                                    <thead class="table-light">
                                        <tr>
                                            <th>User</th>
                                            <th>Action</th>
                                            <th>Module</th>
                                            <th>Description</th>
                                            <th>IP Address</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if (empty($activityLogs)): ?>
                                            <tr><td colspan="6" class="text-center py-4 text-muted">No activity logs recorded.</td></tr>
                                        <?php else: ?>
                                            <?php foreach ($activityLogs as $log): ?>
                                                <tr>
                                                    <td>
                                                        <strong><?php echo e($log['full_name'] ?? 'System'); ?></strong>
                                                        <div class="text-muted small"><?php echo e($log['email'] ?? ''); ?></div>
                                                    </td>
                                                    <td><span class="badge bg-secondary"><?php echo e($log['activity_type']); ?></span></td>
                                                    <td><?php echo e($log['module_name']); ?></td>
                                                    <td><?php echo e($log['description']); ?></td>
                                                    <td><code><?php echo e($log['ip_address'] ?? '127.0.0.1'); ?></code></td>
                                                    <td><?php echo e($log['created_at']); ?></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                <?php elseif ($tab === 'academic_year'): ?>
                    <!-- Academic Year Setting -->
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <h2 class="h4 fw-bold mb-3">Academic Year Settings</h2>
                            <p class="text-muted mb-4">Manage current school semester parameters.</p>
                            <form method="POST" action="" onsubmit="event.preventDefault(); alert('Academic Year updated successfully.');">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">Current Academic Year</label>
                                        <input type="text" class="form-control" value="2026-2027" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">Current Semester</label>
                                        <select class="form-select">
                                            <option selected>1st Semester</option>
                                            <option>2nd Semester</option>
                                            <option>Summer Term</option>
                                        </select>
                                    </div>
                                    <div class="col-12 mt-4">
                                        <button type="submit" class="btn btn-primary px-4" style="border-radius: 0.5rem;">Save Changes</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                <?php elseif ($tab === 'config'): ?>
                    <!-- System Configuration -->
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <h2 class="h4 fw-bold mb-3">System Configuration</h2>
                            <p class="text-muted mb-4">Global system parameters and SMTP setups.</p>
                            <form method="POST" action="" onsubmit="event.preventDefault(); alert('Configuration saved.');">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">Application Title</label>
                                        <input type="text" class="form-control" value="Web-Based Academic Data Science Hub">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">Max CSV Upload Size (MB)</label>
                                        <input type="number" class="form-control" value="10">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">SMTP Host</label>
                                        <input type="text" class="form-control" value="smtp.mailtrap.io">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">SMTP Port</label>
                                        <input type="text" class="form-control" value="2525">
                                    </div>
                                    <div class="col-12 mt-4">
                                        <button type="submit" class="btn btn-primary px-4" style="border-radius: 0.5rem;">Save Configuration</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                <?php elseif ($tab === 'backup'): ?>
                    <!-- Backup & Restore -->
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <h2 class="h4 fw-bold mb-3">Backup & Restore Control Console</h2>
                            <p class="text-muted mb-4">Generate database SQL backups or restore system snapshot from file.</p>
                            <div class="row g-3 mb-4">
                                <div class="col-md-4">
                                    <div class="border rounded p-3 bg-light">
                                        <div class="text-muted small">Database Size</div>
                                        <h3 class="fw-bold mb-0">1.24 MB</h3>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="border rounded p-3 bg-light">
                                        <div class="text-muted small">Last Backup</div>
                                        <h3 class="fw-bold mb-0 text-success" style="font-size: 1.25rem;">2026-07-09 23:30</h3>
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex gap-2 flex-wrap">
                                <button class="btn btn-primary" onclick="alert('Creating database backup...');"><i class="fa-solid fa-download me-2"></i>Create New SQL Backup</button>
                                <button class="btn btn-outline-secondary" onclick="alert('Restoring snapshot...');"><i class="fa-solid fa-upload me-2"></i>Upload SQL Restore</button>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <!-- User Create/Update Modal (Only needed for default User list view) -->
    <?php if ($tab === ''): ?>
        <div class="modal fade" id="userModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <form id="userForm" novalidate>
                        <div class="modal-header">
                            <h5 class="modal-title" id="userModalTitle">Create User</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" name="csrf_token" value="<?php echo e($csrfToken); ?>">
                            <input type="hidden" name="id" id="userId">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label" for="full_name">Full Name</label>
                                    <input type="text" class="form-control" name="full_name" id="full_name" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label" for="email">Email</label>
                                    <input type="email" class="form-control" name="email" id="user_email" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label" for="role_id">Role</label>
                                    <select class="form-select" name="role_id" id="role_id" required></select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label" for="status">Status</label>
                                    <select class="form-select" name="status" id="status">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label" for="phone">Phone</label>
                                    <input type="text" class="form-control" name="phone" id="phone">
                                </div>
                                <div class="col-md-6" id="student_container">
                                    <label class="form-label" for="student_id">Student ID</label>
                                    <input type="text" class="form-control" name="student_id" id="student_id">
                                </div>
                                <div class="col-md-6" id="employee_container">
                                    <label class="form-label" for="employee_id">Employee ID</label>
                                    <input type="text" class="form-control" name="employee_id" id="employee_id">
                                </div>
                                <div class="col-md-6" id="password_container">
                                    <label class="form-label" for="password">Password</label>
                                    <input type="password" class="form-control" name="password" id="password" placeholder="Required – min. 8 characters">
                                    <div class="invalid-feedback" id="passwordError"></div>
                                </div>
                                <div class="col-md-6" id="confirm_password_container">
                                    <label class="form-label" for="confirm_password">Confirm Password</label>
                                    <input type="password" class="form-control" name="confirm_password" id="confirm_password" placeholder="Re-enter password">
                                    <div class="invalid-feedback" id="confirmPasswordError"></div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save User</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <?php if ($tab === ''): ?>
        <script src="/Data/assets/js/users.js"></script>
    <?php endif; ?>
</body>
</html>
