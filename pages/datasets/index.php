<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$csrf = csrf_token();
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
  <nav class="navbar navbar-expand-lg navbar-dark app-navbar px-3">
    <a class="navbar-brand fw-semibold" href="/Data/pages/dashboard/index.php"><?php echo e(APP_NAME); ?></a>
    <div class="ms-auto d-flex gap-2">
      <a class="btn btn-outline-light btn-sm" href="/Data/pages/auth/logout.php">Logout</a>
    </div>
  </nav>

  <main class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h1 class="h3 mb-1">Dataset Library</h1>
        <p class="text-muted mb-0">Browse, search, download template, and upload datasets.</p>
      </div>
      <div class="d-flex gap-2">
        <a class="btn btn-outline-secondary" href="/Data/templates/dataset_template.csv" download>Download Template</a>
        <?php if (user_has_role(['administrator','teacher'])): ?>
          <button class="btn btn-primary" id="openUpload">Upload Dataset</button>
        <?php endif; ?>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <input type="search" id="searchDatasets" class="form-control" placeholder="Search datasets by name or filename">
      </div>
      <div class="col-md-3">
        <select id="filterScope" class="form-select">
          <option value="">All scopes</option>
          <option value="public">Public</option>
          <option value="shared">Shared</option>
          <option value="private">Private</option>
        </select>
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
            <a id="openWorkspaceBtn" class="btn btn-primary shadow-sm" href="#">
              <i class="bi bi-box-arrow-up-right me-2"></i>Open Workspace
            </a>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
        </div>
        <div class="modal-body pt-0">
          <div id="workspaceAlert" class="alert d-none shadow-sm mb-4" role="alert"></div>

          <div class="row g-4">
            <div class="col-12 col-xl-9">
              <div class="card border-0 shadow-sm workspace-section-card mb-4">
                <div class="card-body p-0">
                  <ul class="nav nav-tabs px-3 pt-3" id="workspaceTabs" role="tablist">
                    <li class="nav-item" role="presentation"><button class="nav-link active" id="tab-overview" data-bs-toggle="tab" data-bs-target="#pane-overview" type="button" role="tab">Overview</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-cleaning" data-bs-toggle="tab" data-bs-target="#pane-cleaning" type="button" role="tab">Cleaning</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-analysis" data-bs-toggle="tab" data-bs-target="#pane-analysis" type="button" role="tab">Analysis</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-visual" data-bs-toggle="tab" data-bs-target="#pane-visual" type="button" role="tab">Visualization</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-ml" data-bs-toggle="tab" data-bs-target="#pane-ml" type="button" role="tab">Machine Learning</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-export" data-bs-toggle="tab" data-bs-target="#pane-export" type="button" role="tab">Export</button></li>
                  </ul>

                  <div class="tab-content p-3 p-lg-4">
                    <div class="tab-pane fade show active" id="pane-overview" role="tabpanel">
                      <div class="row g-3 mb-4">
                        <div class="col-6 col-xl-4"><div class="card border-0 shadow-sm workspace-stat-card h-100"><div class="card-body"><div class="text-muted small">Rows</div><div class="h4 mb-0" id="workspaceSummaryRows">-</div></div></div></div>
                        <div class="col-6 col-xl-4"><div class="card border-0 shadow-sm workspace-stat-card h-100"><div class="card-body"><div class="text-muted small">Columns</div><div class="h4 mb-0" id="workspaceSummaryColumns">-</div></div></div></div>
                        <div class="col-6 col-xl-4"><div class="card border-0 shadow-sm workspace-stat-card h-100"><div class="card-body"><div class="text-muted small">Numeric Columns</div><div class="h4 mb-0" id="workspaceSummaryNumeric">-</div></div></div></div>
                        <div class="col-6 col-xl-4"><div class="card border-0 shadow-sm workspace-stat-card h-100"><div class="card-body"><div class="text-muted small">Categorical Columns</div><div class="h4 mb-0" id="workspaceSummaryCategorical">-</div></div></div></div>
                        <div class="col-6 col-xl-4"><div class="card border-0 shadow-sm workspace-stat-card h-100"><div class="card-body"><div class="text-muted small">Missing Values</div><div class="h4 mb-0" id="workspaceSummaryMissing">-</div></div></div></div>
                        <div class="col-6 col-xl-4"><div class="card border-0 shadow-sm workspace-stat-card h-100"><div class="card-body"><div class="text-muted small">Duplicate Rows</div><div class="h4 mb-0" id="workspaceSummaryDuplicates">-</div></div></div></div>
                      </div>

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

                    <div class="tab-pane fade" id="pane-cleaning" role="tabpanel">
                      <div class="row g-4">
                        <div class="col-12 col-xl-6">
                          <div class="card border-0 shadow-sm workspace-section-card h-100">
                            <div class="card-body">
                              <div class="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                  <h6 class="mb-1">Data Cleaning</h6>
                                  <p class="text-muted small mb-0">Inspect issues, run cleanup, and review the report.</p>
                                </div>
                                <span class="badge text-bg-warning-subtle text-warning-emphasis">Automated</span>
                              </div>
                              <div class="row g-3 mb-3">
                                <div class="col-6"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Missing Values</div><div class="h5 mb-0" id="workspaceCleaningMissing">-</div></div></div>
                                <div class="col-6"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Duplicate Rows</div><div class="h5 mb-0" id="workspaceCleaningDuplicates">-</div></div></div>
                                <div class="col-6"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Inconsistent Values</div><div class="h5 mb-0" id="workspaceCleaningInconsistent">-</div></div></div>
                                <div class="col-6"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Invalid Data Types</div><div class="h5 mb-0" id="workspaceCleaningInvalid">-</div></div></div>
                              </div>
                              <div class="d-flex flex-wrap gap-2 mb-4">
                                <button type="button" id="runCleanBtn" class="btn btn-primary">Clean Dataset</button>
                                <button type="button" id="previewCleanBtn" class="btn btn-outline-secondary">Preview Cleaned</button>
                              </div>
                              <div class="row g-3">
                                <div class="col-12 col-lg-6">
                                  <label class="form-label" for="missingStrategy">Missing values strategy</label>
                                  <select id="missingStrategy" class="form-select">
                                    <option value="none">No automatic fill</option>
                                    <option value="fill_zero">Fill zeros</option>
                                    <option value="fill_mean">Fill mean</option>
                                  </select>
                                </div>
                                <div class="col-12 col-lg-6 d-flex align-items-end">
                                  <div class="form-check mt-2">
                                    <input class="form-check-input" type="checkbox" id="optRemoveDuplicates" checked>
                                    <label class="form-check-label" for="optRemoveDuplicates">Remove duplicate rows</label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="col-12 col-xl-6">
                          <div class="card border-0 shadow-sm workspace-section-card h-100">
                            <div class="card-body">
                              <h6 class="mb-2">Cleaning Report</h6>
                              <div class="row g-3 mb-3">
                                <div class="col-6"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Rows Removed</div><div class="h5 mb-0" id="workspaceRowsRemoved">-</div></div></div>
                                <div class="col-6"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Duplicates Removed</div><div class="h5 mb-0" id="workspaceDuplicatesRemoved">-</div></div></div>
                                <div class="col-6"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Values Fixed</div><div class="h5 mb-0" id="workspaceValuesFixed">-</div></div></div>
                                <div class="col-6"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Success Rate</div><div class="h5 mb-0" id="workspaceCleaningSuccess">-</div></div></div>
                              </div>
                              <pre id="cleanOutput" class="p-3 bg-light rounded-3 small mb-0">No cleaning report yet.</pre>
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
                              <h6 class="mb-1">Statistical Analysis</h6>
                              <p class="text-muted small mb-0">Automatic descriptive statistics for numeric columns.</p>
                            </div>
                            <button id="runAnalyzeBtn" class="btn btn-outline-primary" type="button">Run Analysis</button>
                          </div>
                          <div id="analysisStatsGrid" class="row g-3 mb-4"></div>
                          <div class="row g-3">
                            <div class="col-12 col-xl-7">
                              <div class="card border-0 shadow-sm workspace-section-card h-100">
                                <div class="card-body">
                                  <h6 class="mb-3">Insights</h6>
                                  <div id="analysisInsights" class="d-grid gap-2"></div>
                                </div>
                              </div>
                            </div>
                            <div class="col-12 col-xl-5">
                              <div class="card border-0 shadow-sm workspace-section-card h-100">
                                <div class="card-body">
                                  <h6 class="mb-3">Correlation Matrix</h6>
                                  <div id="analysisCorrelation" class="workspace-chart-placeholder text-muted small">Run analysis to populate the matrix.</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <pre id="analysisOutput" class="p-3 bg-light rounded-3 small mt-3 mb-0">No analysis yet.</pre>
                        </div>
                      </div>
                    </div>

                    <div class="tab-pane fade" id="pane-visual" role="tabpanel">
                      <div class="card border-0 shadow-sm workspace-section-card mb-4">
                        <div class="card-body">
                          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                            <div>
                              <h6 class="mb-1">Visualizations</h6>
                              <p class="text-muted small mb-0">Responsive chart gallery driven by the current dataset sample.</p>
                            </div>
                            <button id="runVisualBtn" class="btn btn-outline-primary" type="button">Generate Charts</button>
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
                              <p class="text-muted small mb-4">Select a target, choose feature variables, and train a regression model.</p>
                              <div class="mb-3">
                                <label class="form-label" for="predictTarget">Target Variable</label>
                                <select id="predictTarget" class="form-select"></select>
                              </div>
                              <div class="mb-3">
                                <label class="form-label" for="predictFeatures">Feature Variables</label>
                                <select id="predictFeatures" class="form-select" multiple size="6"></select>
                                <div class="form-text">Hold Ctrl/Command to select multiple features.</div>
                              </div>
                              <div class="mb-3">
                                <label class="form-label" for="predictModel">Regression Model</label>
                                <select id="predictModel" class="form-select">
                                  <option value="linear_regression">Linear Regression</option>
                                  <option value="ridge">Ridge Regression</option>
                                  <option value="lasso">Lasso Regression</option>
                                </select>
                              </div>
                              <div class="d-flex flex-wrap gap-2">
                                <button id="runPredictBtn" class="btn btn-primary" type="button">Train Model</button>
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
                                <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Accuracy</div><div class="h5 mb-0" id="predictionAccuracy">-</div></div></div>
                                <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">R² Score</div><div class="h5 mb-0" id="predictionR2">-</div></div></div>
                                <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">MAE</div><div class="h5 mb-0" id="predictionMae">-</div></div></div>
                                <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">RMSE</div><div class="h5 mb-0" id="predictionRmse">-</div></div></div>
                              </div>
                              <div id="predictionMatrix" class="workspace-chart-placeholder text-muted small mb-3">Confusion matrix will appear for classification workflows.</div>
                              <pre id="predictOutput" class="p-3 bg-light rounded-3 small mb-0">No predictions yet.</pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="tab-pane fade" id="pane-export" role="tabpanel">
                      <div class="card border-0 shadow-sm workspace-section-card">
                        <div class="card-body">
                          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                            <div>
                              <h6 class="mb-1">Export</h6>
                              <p class="text-muted small mb-0">Download the current dataset outputs and generated artifacts.</p>
                            </div>
                            <span class="badge text-bg-info-subtle text-info-emphasis">Ready</span>
                          </div>
                          <div class="row g-3">
                            <div class="col-12 col-md-6 col-xl-3"><a href="#" class="btn btn-outline-primary w-100" id="downloadCleanedCsvBtn"><i class="bi bi-filetype-csv me-2"></i>Download Cleaned CSV</a></div>
                            <div class="col-12 col-md-6 col-xl-3"><button type="button" class="btn btn-outline-secondary w-100" id="downloadAnalysisPdfBtn"><i class="bi bi-file-earmark-pdf me-2"></i>Download Analysis PDF</button></div>
                            <div class="col-12 col-md-6 col-xl-3"><button type="button" class="btn btn-outline-secondary w-100" id="downloadChartsBtn"><i class="bi bi-images me-2"></i>Download Charts</button></div>
                            <div class="col-12 col-md-6 col-xl-3"><button type="button" class="btn btn-outline-secondary w-100" id="downloadPredictionResultsBtn"><i class="bi bi-clipboard-data me-2"></i>Download Prediction Results</button></div>
                          </div>
                          <div class="workspace-generate-note mt-3">Use the action buttons below to generate fresh analysis outputs before exporting.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-12 col-xl-3">
                <div class="workspace-sidebar">
                  <div class="card border-0 shadow-sm mb-4">
                    <div class="card-body">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">Dataset Summary</h6>
                        <span class="badge text-bg-light text-dark" id="workspaceDatasetStatus">Idle</span>
                      </div>
                      <div class="d-grid gap-3">
                        <div class="workspace-mini-kpi p-3"><div class="text-muted small">Rows</div><div class="h5 mb-0" id="workspaceSidebarRows">-</div></div>
                        <div class="workspace-mini-kpi p-3"><div class="text-muted small">Columns</div><div class="h5 mb-0" id="workspaceSidebarColumns">-</div></div>
                        <div class="workspace-mini-kpi p-3"><div class="text-muted small">Missing Values</div><div class="h5 mb-0" id="workspaceSidebarMissing">-</div></div>
                        <div class="workspace-mini-kpi p-3"><div class="text-muted small">Duplicates</div><div class="h5 mb-0" id="workspaceSidebarDuplicates">-</div></div>
                        <div class="workspace-mini-kpi p-3"><div class="text-muted small">Charts Generated</div><div class="h5 mb-0" id="workspaceChartsGenerated">-</div></div>
                        <div class="workspace-mini-kpi p-3"><div class="text-muted small">Prediction Status</div><div class="h5 mb-0" id="workspacePredictionStatus">Not run</div></div>
                        <div class="workspace-mini-kpi p-3"><div class="text-muted small">Last Analysis Time</div><div class="h6 mb-0" id="workspaceLastAnalysisTime">-</div></div>
                      </div>
                    </div>
                  </div>

                  <div class="card border-0 shadow-sm">
                    <div class="card-body">
                      <h6 class="mb-3">Workspace Notes</h6>
                      <div class="text-muted small mb-2">• Preview shows the first 20 rows.</div>
                      <div class="text-muted small mb-2">• Cleaning, analysis, and machine learning use the existing backend APIs.</div>
                      <div class="text-muted small">• Charts resize responsively and can be expanded or downloaded individually.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-0 pt-0 bg-white">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 w-100">
              <div class="d-flex flex-wrap gap-2">
                <button type="button" class="btn btn-primary" id="workspaceAnalyzeBtn"><i class="bi bi-graph-up me-2"></i>Analyze Dataset</button>
                <button type="button" class="btn btn-outline-primary" id="workspaceVisualizeBtn"><i class="bi bi-bar-chart me-2"></i>Generate Visualizations</button>
                <button type="button" class="btn btn-outline-primary" id="workspaceMachineLearningBtn"><i class="bi bi-cpu me-2"></i>Run Machine Learning</button>
                <button type="button" class="btn btn-outline-secondary" id="workspaceExportResultsBtn"><i class="bi bi-download me-2"></i>Export Results</button>
              </div>
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close Workspace</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  <!-- Upload Modal -->
  <div class="modal fade" id="uploadModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <form id="uploadForm" enctype="multipart/form-data">
          <div class="modal-header">
            <h5 class="modal-title">Upload Dataset</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" name="csrf_token" value="<?php echo e($csrf); ?>">
            <div class="mb-3">
              <label class="form-label">Dataset file (CSV)</label>
              <input type="file" name="dataset" class="form-control" accept=".csv" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Dataset name</label>
              <input type="text" name="dataset_name" class="form-control">
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea name="description" class="form-control" rows="3"></textarea>
            </div>
            <input type="hidden" name="shared_scope" value="private">
            <div class="mb-3">
              <div class="form-text">Preview will be shown before final upload; datasets are private by default.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Upload</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="/Data/assets/js/datasets_workspace.js"></script>
  <script src="/Data/assets/js/datasets.js"></script>
</body>
</html>
