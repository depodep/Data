<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../includes/bootstrap.php';

require_role(['administrator']);

$csrfToken = csrf_token();
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
    <nav class="navbar navbar-expand-lg navbar-dark app-navbar px-3">
        <a class="navbar-brand fw-semibold" href="/Data/pages/admin/users/index.php"><?php echo e(APP_NAME); ?></a>
        <div class="ms-auto d-flex gap-2">
            <a class="btn btn-outline-light btn-sm" href="/Data/pages/auth/logout.php">Logout</a>
        </div>
    </nav>

    <main class="container-fluid py-4">
        <div class="row g-4">
            <div class="col-12">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                    <div>
                        <h1 class="h3 mb-1">User Management</h1>
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
    </main>

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
                            <div class="col-md-6">
                                <label class="form-label" for="student_id">Student ID</label>
                                <input type="text" class="form-control" name="student_id" id="student_id">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label" for="employee_id">Employee ID</label>
                                <input type="text" class="form-control" name="employee_id" id="employee_id">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label" for="password">Password</label>
                                <input type="password" class="form-control" name="password" id="password" placeholder="Leave blank when updating without changing password">
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

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/Data/assets/js/users.js"></script>
</body>
</html>
