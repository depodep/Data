<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$csrf = csrf_token();
$user = current_user();
$displayName = $user['full_name'] ?? 'User';

// Determine active subpage for sidebar
$activePage = 'datasets';
$activeSubPage = 'search';

if (isset($_GET['upload'])) {
    $activeSubPage = 'upload';
} elseif (isset($_GET['filter']) && $_GET['filter'] === 'my') {
    $activeSubPage = 'my_datasets';
} elseif (isset($_GET['status']) && $_GET['status'] === 'archived') {
    $activeSubPage = 'archived_datasets';
} elseif (isset($_GET['all']) || $user['role_slug'] === 'administrator') {
    $activeSubPage = 'all_datasets';
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="<?php echo e($csrf); ?>">
  <title>Dataset Library | <?php echo e(APP_NAME); ?></title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <link href="/Data/assets/css/app.css" rel="stylesheet">
</head>
<body class="app-admin-shell">
  <div class="app-layout-wrapper">
    <?php require_once __DIR__ . '/../../includes/sidebar.php'; ?>
    
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
        <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h1 class="h3 mb-1">Dataset Library</h1>
        <p class="text-muted mb-0">Browse, search, download template, and upload datasets.</p>
      </div>
      <div class="d-flex gap-2">
        <a class="btn btn-outline-secondary" href="/Data/api/datasets/template.php" download="dataset_template.csv">Download Template</a>
        <?php if (user_has_role(['administrator','teacher'])): ?>
          <a class="btn btn-primary" href="/Data/pages/datasets/upload.php">Upload Dataset</a>
        <?php endif; ?>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <input type="search" id="searchDatasets" class="form-control" placeholder="Search datasets by name or filename">
      </div>
      <div class="col-md-3 text-end">
        <select id="perPage" class="form-select">
          <option value="5">5 per page</option>
          <option value="10" selected>10 per page</option>
          <option value="25">25 per page</option>
        </select>
      </div>
    </div>

    <div id="datasetsGrid" class="row g-3"></div>

    <nav class="mt-4">
      <ul id="datasetsPagination" class="pagination"></ul>
    </nav>
  </main>
    </div>
  </div>

  <!-- Dataset Analysis Workspace Modal -->
  <div class="modal fade" id="vizOptionsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-scrollable modal-fullscreen-lg-down analysis-workspace-dialog">
      <div class="modal-content analysis-workspace-modal shadow-lg border-0">
        <div class="modal-header border-0 pb-2 workspace-hero align-items-start">
          <div class="me-3">
            <p class="text-uppercase text-primary fw-semibold small mb-1">Dataset Analysis Workspace</p>
            <h5 class="modal-title mb-2" id="vizDatasetName">Dataset Analysis Workspace</h5>
            <p class="text-muted mb-3" id="vizDatasetSubtitle">Analyze, clean, visualize, and generate insights from the uploaded dataset.</p>
            <div class="d-flex flex-wrap gap-2" id="workspaceMetaChips">
              <span class="badge text-bg-light text-dark" id="vizDatasetOwner">Owner: -</span>
              <span class="badge text-bg-light text-dark" id="vizDatasetDate">Uploaded: -</span>
              <span class="badge text-bg-light text-dark" id="vizDatasetRows">Rows: -</span>
              <span class="badge text-bg-light text-dark" id="vizDatasetColumns">Columns: -</span>
              <span class="badge text-bg-light text-dark" id="vizDatasetSize">File Size: -</span>
            </div>
          </div>
          <div class="ms-auto d-flex flex-column align-items-end gap-2">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
        </div>
        <div class="modal-body pt-0">
          <div id="workspaceAlert" class="alert d-none shadow-sm mb-4" role="alert"></div>

          <div>
              <div class="card border-0 shadow-sm workspace-section-card mb-4">
                <div class="card-body p-0">
                  <ul class="nav nav-tabs px-3 pt-3 sticky-top bg-body z-3 shadow-sm" id="workspaceTabs" role="tablist">
                    <li class="nav-item" role="presentation"><button class="nav-link active" id="tab-overview" data-bs-toggle="tab" data-bs-target="#pane-overview" type="button" role="tab">Overview</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-analysis" data-bs-toggle="tab" data-bs-target="#pane-analysis" type="button" role="tab">Analysis</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-visual" data-bs-toggle="tab" data-bs-target="#pane-visual" type="button" role="tab">Visualization</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-ml" data-bs-toggle="tab" data-bs-target="#pane-ml" type="button" role="tab">Machine Learning</button></li>
                  </ul>

                  <div class="tab-content p-3 p-lg-4">
                    <div class="tab-pane fade show active" id="pane-overview" role="tabpanel">
                      <div class="card border-0 shadow-sm workspace-preview-shell mb-4">
                        <div class="card-header bg-white border-0 py-3">
                          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div>
                              <h6 class="mb-1">Dataset Preview</h6>
                              <p class="text-muted small mb-0">Search, sort, and page through the first 20 rows.</p>
                            </div>
                            <div class="text-muted small" id="workspacePreviewMeta">Total records: -</div>
                          </div>
                        </div>
                        <div class="card-body p-0">
                          <div id="previewArea" class="workspace-preview-table">Loading preview…</div>
                        </div>
                      </div>

                      <div class="accordion" id="workspaceInfoAccordion">
                        <div class="accordion-item border-0 shadow-sm mb-3 rounded-4 overflow-hidden">
                          <h2 class="accordion-header" id="headingColumns">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseColumns" aria-expanded="true">Dataset Information</button>
                          </h2>
                          <div id="collapseColumns" class="accordion-collapse collapse show" data-bs-parent="#workspaceInfoAccordion">
                            <div class="accordion-body">
                              <div id="workspaceColumnInfo" class="row g-3"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="tab-pane fade" id="pane-analysis" role="tabpanel">
                      <div class="card border-0 shadow-sm workspace-section-card mb-4">
                        <div class="card-body">
                          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                            <div>
                              <h6 class="mb-1">Statistical Analysis Dashboard</h6>
                              <p class="text-muted small mb-0">Dynamic analysis for numeric columns only, including per-field summary, trend, and insights.</p>
                            </div>
                          </div>

                          <div id="analysisStateAlert" class="alert alert-info d-none mb-4" role="alert"></div>

                          <div id="analysisLoading" class="d-none text-center py-5">
                            <div class="spinner-border text-primary mb-3" role="status" aria-hidden="true"></div>
                            <div class="text-muted">Calculating statistics from the uploaded dataset…</div>
                          </div>

                          <div id="analysisEmptyState" class="alert alert-warning mb-0 d-none" role="alert">No dataset has been uploaded yet.</div>

                          <div id="analysisDashboard" class="d-none">
                            <div class="card border-0 shadow-sm workspace-section-card mb-4">
                              <div class="card-body">
                                <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                                  <div>
                                    <h6 class="mb-1">Descriptive Statistics</h6>
                                    <p class="text-muted small mb-0">Each numeric field is summarized in a responsive table.</p>
                                  </div>
                                  <span class="badge text-bg-light text-dark">Numeric columns only</span>
                                </div>
                                <div class="table-responsive">
                                  <table class="table table-striped table-hover align-middle mb-0" id="analysisDescriptiveTable">
                                    <thead class="table-light">
                                      <tr>
                                        <th>Field</th>
                                        <th>Mean</th>
                                        <th>Median</th>
                                        <th>Mode</th>
                                        <th>Minimum</th>
                                        <th>Maximum</th>
                                        <th>Standard Deviation</th>
                                        <th>Variance</th>
                                      </tr>
                                    </thead>
                                    <tbody></tbody>
                                  </table>
                                </div>
                              </div>
                            </div>

                            <div class="row g-4 mb-4">
                              <div class="col-12">
                                <div class="card border-0 shadow-sm workspace-section-card h-100">
                                  <div class="card-body">
                                    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                                      <div>
                                        <h6 class="mb-1">Trend Analysis</h6>
                                        <p class="text-muted small mb-0">Quiz Score, Midterm Score, Final Score, and Attendance trends.</p>
                                      </div>
                                      <span class="badge text-bg-success-subtle text-success-emphasis">Chart.js</span>
                                    </div>
                                    <div class="d-grid gap-3" id="analysisTrendCards"></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div class="card border-0 shadow-sm workspace-section-card">
                              <div class="card-body">
                                <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                                  <div>
                                    <h6 class="mb-1">Insights</h6>
                                    <p class="text-muted small mb-0">Auto-generated numeric highlights from the uploaded dataset.</p>
                                  </div>
                                  <span class="badge text-bg-info-subtle text-info-emphasis">Auto-generated</span>
                                </div>
                                <div class="row g-3" id="analysisInsightCards"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="tab-pane fade" id="pane-visual" role="tabpanel">
                      <div class="card border-0 shadow-sm workspace-section-card mb-4">
                        <div class="card-body">
                          <div class="mb-3">
                            <h6 class="mb-1">Visualizations</h6>
                            <p class="text-muted small mb-0">Responsive chart gallery driven by the current dataset sample.</p>
                          </div>
                          <div class="row g-3" id="visualOutput"></div>
                        </div>
                      </div>
                    </div>

                    <div class="tab-pane fade" id="pane-ml" role="tabpanel">
                      <div class="row g-4">
                        <div class="col-12 col-xl-5">
                          <div class="card border-0 shadow-sm workspace-section-card h-100">
                            <div class="card-body">
                              <h6 class="mb-2">Prediction</h6>
                              <div class="row g-3 mb-4">
                                <div class="col-12">
                                  <div class="alert alert-light border shadow-sm small mb-0">
                                    <strong>Target</strong> is what you want to predict (e.g., Final Score). <strong>Feature</strong> is the input you use to make the prediction (e.g., Attendance).
                                  </div>
                                </div>
                                <div class="col-6">
                                  <div class="workspace-mini-kpi p-3 h-100">
                                    <label for="predictTargetSelect" class="text-muted small fw-semibold">Target Column</label>
                                    <select id="predictTargetSelect" class="form-select form-select-sm mt-1"></select>
                                  </div>
                                </div>
                                <div class="col-6">
                                  <div class="workspace-mini-kpi p-3 h-100">
                                    <label for="predictFeatureSelect" class="text-muted small fw-semibold">Feature Column</label>
                                    <select id="predictFeatureSelect" class="form-select form-select-sm mt-1"></select>
                                  </div>
                                </div>
                              </div>
                              <div class="d-flex flex-wrap gap-2">
                                <button id="runPredictBtn" class="btn btn-primary" type="button">Run Prediction</button>
                                <button id="resetPredictBtn" class="btn btn-outline-secondary" type="button">Reset</button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="col-12 col-xl-7">
                          <div class="card border-0 shadow-sm workspace-section-card mb-4">
                            <div class="card-body">
                              <h6 class="mb-3">Prediction Result</h6>
                              <div class="row g-3 mb-3" id="predictionMetricsGrid">
                                <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Prediction Score</div><div class="h5 mb-0" id="predictionAccuracy">-</div></div></div>
                                <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">R² Score</div><div class="h5 mb-0" id="predictionR2">-</div></div></div>
                                <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">MAE</div><div class="h5 mb-0" id="predictionMae">-</div></div></div>
                                <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">RMSE</div><div class="h5 mb-0" id="predictionRmse">-</div></div></div>
                              </div>
                              <div id="predictionMatrix" class="workspace-chart-placeholder text-muted small mb-3">Predicted values and regression chart will appear after training.</div>
                              <div id="predictionInsight" class="alert alert-info shadow-sm d-none mt-3" role="alert"></div>
                              <div id="predictOutput" class="d-none"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>


                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="/Data/assets/js/datasets_workspace.js"></script>
  <script src="/Data/assets/js/datasets.js"></script>
</body>
</html>
