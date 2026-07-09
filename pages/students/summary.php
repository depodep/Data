<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['student']);

$user = current_user();
 $csrfToken = csrf_token();
$studentId = $user['student_id'] ?? 'Unknown';
$displayName = $user['full_name'] ?? 'Student';
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="<?php echo e($csrfToken); ?>">
  <title>Student View | <?php echo e(APP_NAME); ?></title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
  <link href="/Data/assets/css/app.css" rel="stylesheet">
</head>
<body class="app-dashboard-shell">
  <nav class="navbar navbar-expand-lg navbar-dark app-navbar px-3">
    <a class="navbar-brand fw-semibold" href="/Data/pages/students/summary.php"><?php echo e(APP_NAME); ?></a>
    <div class="ms-auto d-flex gap-2 flex-wrap">
      <a class="btn btn-outline-light btn-sm" href="/Data/pages/auth/logout.php">Logout</a>
    </div>
  </nav>

  <main class="container-fluid py-4">
    <div class="row g-4 mb-2">
      <div class="col-12 col-xl-8">
        <div class="dashboard-hero card border-0 shadow-sm">
          <div class="card-body p-4 p-md-5">
            <p class="text-uppercase text-info fw-semibold small mb-2">Student View</p>
            <h1 class="display-6 fw-bold mb-2">Welcome back, <?php echo e($displayName); ?></h1>
            <p class="lead text-muted mb-0">Student ID: <?php echo e($studentId); ?>. You only see datasets linked to your Student ID.</p>
          </div>
        </div>
      </div>
      <div class="col-12 col-xl-4">
        <div class="card border-0 shadow-sm h-100 quick-actions-card">
          <div class="card-body p-4">
            <h2 class="h5 mb-3">Quick Overview</h2>
            <div class="row g-3">
              <div class="col-6">
                <div class="workspace-mini-kpi p-3 h-100">
                  <div class="text-muted small">Datasets</div>
                  <div class="h4 mb-0" id="studentDatasetCount">0</div>
                </div>
              </div>
              <div class="col-6">
                <div class="workspace-mini-kpi p-3 h-100">
                  <div class="text-muted small">Records</div>
                  <div class="h4 mb-0" id="studentRecordCount">0</div>
                </div>
              </div>
            </div>
            <div class="small text-muted mt-3">Each dataset card shows your Quiz Score, Midterm Score, Final Score, Attendance, insights, and a graph.</div>
          </div>
        </div>
      </div>
    </div>

    <div id="studentDashboardAlert" class="alert d-none shadow-sm mb-4" role="alert"></div>

    <div class="card border-0 shadow-sm mb-4 d-none" id="studentEmptyState">
      <div class="card-body p-5 text-center">
        <h2 class="h5 mb-2">No linked datasets found</h2>
        <p class="text-muted mb-0">Your Student ID does not match any uploaded dataset records yet.</p>
      </div>
    </div>

    <div class="row g-4" id="studentDatasetsGrid">
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body p-4 text-center text-muted">Loading student datasets...</div>
        </div>
      </div>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="/Data/assets/js/student_dashboard.js"></script>
</body>
</html>
