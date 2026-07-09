<?php
declare(strict_types=1);

if (!function_exists('current_user') || current_user() === null) {
    return;
}

$sidebarUser = current_user();
$sidebarRole = $sidebarUser['role_slug'] ?? '';
$activePage = $activePage ?? 'dashboard';
$activeSubPage = $activeSubPage ?? '';

?>
<!-- FontAwesome for consistent icons -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">

<!-- Sidebar Overlay for Mobile -->
<div class="sidebar-overlay" id="sidebarOverlay"></div>

<!-- App Sidebar -->
<aside class="app-sidebar" id="appSidebar">
    <a href="/Data/pages/dashboard/index.php" class="sidebar-brand">
        <i class="fa-solid fa-graduation-cap me-2 text-primary"></i>DATA SCIENCE HUB
    </a>
    
    <div class="sidebar-menu">
        <ul class="sidebar-nav">
            <li class="sidebar-nav-item">
                <a class="sidebar-nav-link <?php echo $activePage === 'dashboard' ? 'active' : ''; ?>" href="/Data/pages/dashboard/index.php">
                    <i class="fa-solid fa-house"></i>Dashboard
                </a>
            </li>
            
            <li class="sidebar-nav-item">
                <a class="sidebar-nav-link <?php echo $activePage === 'datasets' ? 'active' : ''; ?>" href="/Data/pages/datasets/index.php">
                    <i class="fa-solid fa-database"></i>Data Library
                </a>
            </li>

            <?php if ($sidebarRole === 'administrator'): ?>
                <li class="sidebar-nav-item">
                    <div class="sidebar-submenu-title">
                        <i class="fa-solid fa-users me-2"></i>User Management
                    </div>
                    <ul class="sidebar-submenu">
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'users_admin' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?role=administrator">
                                Administrators
                            </a>
                        </li>
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'users_teacher' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?role=teacher">
                                Teachers
                            </a>
                        </li>
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'users_student' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?role=student">
                                Students
                            </a>
                        </li>
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'roles' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?tab=roles">
                                Roles & Permissions
                            </a>
                        </li>
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'activity_logs' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?tab=activity">
                                Activity Logs
                            </a>
                        </li>
                    </ul>
                </li>

                <li class="sidebar-nav-item">
                    <div class="sidebar-submenu-title">
                        <i class="fa-solid fa-cog me-2"></i>System Settings
                    </div>
                    <ul class="sidebar-submenu">
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'academic_year' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?tab=academic_year">
                                Academic Year
                            </a>
                        </li>
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'sys_config' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?tab=config">
                                System Configuration
                            </a>
                        </li>
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'backup' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?tab=backup">
                                Backup & Restore
                            </a>
                        </li>
                        <li class="sidebar-submenu-item">
                            <a class="sidebar-submenu-link <?php echo $activeSubPage === 'audit_logs' ? 'active' : ''; ?>" href="/Data/pages/admin/users/index.php?tab=audit">
                                Audit Logs
                            </a>
                        </li>
                    </ul>
                </li>
            <?php endif; ?>

            <li class="sidebar-nav-item mt-4">
                <a class="sidebar-nav-link" href="#" id="sidebarProfileLink">
                    <i class="fa-solid fa-user"></i>My Profile
                </a>
            </li>
            
            <li class="sidebar-nav-item mt-2">
                <a class="sidebar-nav-link text-danger" href="/Data/pages/auth/logout.php">
                    <i class="fa-solid fa-right-from-bracket text-danger"></i>Logout
                </a>
            </li>
        </ul>
    </div>
</aside>

<!-- Profile Modal -->
<div class="modal fade" id="sidebarProfileModal" tabindex="-1" aria-labelledby="sidebarProfileModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius: 1.25rem;">
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold" id="sidebarProfileModalLabel">My Profile</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center p-4">
                <div class="profile-modal-avatar mx-auto mb-3">
                    <?php echo e(mb_substr($sidebarUser['full_name'] ?? 'U', 0, 1)); ?>
                </div>
                <h4 class="fw-bold mb-1"><?php echo e($sidebarUser['full_name'] ?? 'User'); ?></h4>
                <p class="text-muted small mb-4"><?php echo e($sidebarUser['email'] ?? 'email@example.com'); ?></p>
                
                <div class="card border-0 bg-light p-3 text-start" style="border-radius: 1rem;">
                    <div class="row g-2 small text-muted">
                        <div class="col-5 fw-semibold text-dark">Role:</div>
                        <div class="col-7"><?php echo e($sidebarUser['role_name'] ?? 'Member'); ?></div>
                        
                        <div class="col-5 fw-semibold text-dark">Status:</div>
                        <div class="col-7">
                            <span class="badge text-bg-success px-2 py-1 rounded-pill small"><?php echo e($sidebarUser['status'] ?? 'active'); ?></span>
                        </div>
                        
                        <?php if (!empty($sidebarUser['student_id'])): ?>
                            <div class="col-5 fw-semibold text-dark">Student ID:</div>
                            <div class="col-7"><?php echo e($sidebarUser['student_id']); ?></div>
                        <?php endif; ?>
                        
                        <?php if (!empty($sidebarUser['employee_id'])): ?>
                            <div class="col-5 fw-semibold text-dark">Employee ID:</div>
                            <div class="col-7"><?php echo e($sidebarUser['employee_id']); ?></div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <div class="modal-footer border-0 pt-0 justify-content-center">
                <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal" style="border-radius: 0.75rem;">Close</button>
            </div>
        </div>
    </div>
</div>

<!-- Sidebar Toggler Script -->
<script>
document.addEventListener('DOMContentLoaded', () => {
    const toggler = document.getElementById('sidebarToggler');
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (toggler && sidebar && overlay) {
        const toggle = () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        };
        toggler.addEventListener('click', toggle);
        overlay.addEventListener('click', toggle);
    }
    
    // Setup My Profile Modal
    const profileLink = document.getElementById('sidebarProfileLink');
    const profileModalEl = document.getElementById('sidebarProfileModal');
    if (profileLink && profileModalEl && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(profileModalEl);
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            modal.show();
        });
    }
});
</script>
