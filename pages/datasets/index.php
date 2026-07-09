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
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
        </div>
        <div class="modal-body pt-0">
          <div id="workspaceAlert" class="alert d-none shadow-sm mb-4" role="alert"></div>

          <div class="row g-4">
            <div class="col-12 col-xl-9">
              <div class="card border-0 shadow-sm workspace-section-card mb-4">
                <div class="card-body p-0">
                  <ul class="nav nav-tabs px-3 pt-3 sticky-top bg-body z-3 shadow-sm" id="workspaceTabs" role="tablist">
                    <li class="nav-item" role="presentation"><button class="nav-link active" id="tab-overview" data-bs-toggle="tab" data-bs-target="#pane-overview" type="button" role="tab">Overview</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-analysis" data-bs-toggle="tab" data-bs-target="#pane-analysis" type="button" role="tab">Analysis</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-visual" data-bs-toggle="tab" data-bs-target="#pane-visual" type="button" role="tab">Visualization</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-ml" data-bs-toggle="tab" data-bs-target="#pane-ml" type="button" role="tab">Machine Learning</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="tab-export" data-bs-toggle="tab" data-bs-target="#pane-export" type="button" role="tab">Export</button></li>
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
                              <p class="text-muted small mb-3" id="predictionSummary">Predict Final Score from Attendance using Linear Regression.</p>
                              <div class="row g-3 mb-4">
                                <div class="col-6">
                                  <div class="workspace-mini-kpi p-3 h-100">
                                    <div class="text-muted small">Target</div>
                                    <div class="h5 mb-0">Final Score</div>
                                  </div>
                                </div>
                                <div class="col-6">
                                  <div class="workspace-mini-kpi p-3 h-100">
                                    <div class="text-muted small">Feature</div>
                                    <div class="h5 mb-0">Attendance</div>
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
                              <div id="predictionMatrix" class="workspace-chart-placeholder text-muted small mb-3">Predicted values will appear here for the Attendance-based regression.</div>
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
                  <div class="card border-0 shadow-sm">
                    <div class="card-body">
                      <h6 class="mb-3">Analytics</h6>
                      <div class="d-grid gap-2 small text-muted">
                        <div>Loads after the preview is ready</div>
                        <div>Shows numeric trends only</div>
                        <div>Refreshes as soon as data is available</div>
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
            <input type="hidden" name="stored" id="uploadStored">
            <div id="uploadAlert" class="alert d-none" role="alert"></div>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">Dataset file (CSV)</label>
                <input type="file" id="uploadDatasetFile" name="dataset" class="form-control" accept=".csv">
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Dataset name</label>
                <input type="text" name="dataset_name" id="uploadDatasetName" class="form-control" placeholder="Optional">
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">Shared scope</label>
                <select name="shared_scope" id="uploadSharedScope" class="form-select">
                  <option value="private" selected>Private</option>
                  <option value="shared">Shared</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Description</label>
                <textarea name="description" id="uploadDescription" class="form-control" rows="3" placeholder="Optional description"></textarea>
              </div>
            </div>

            <div class="mt-4 border rounded-3 p-3 bg-light">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 class="mb-1">Upload Preview</h6>
                  <p class="text-muted small mb-0">Preview the first rows and apply cleaning options before saving.</p>
                </div>
                <div class="btn-group btn-group-sm" role="group" aria-label="Upload preview actions">
                  <button type="button" id="uploadPreviewBtn" class="btn btn-outline-primary">Preview Data</button>
                  <button type="button" id="uploadCleanPreviewBtn" class="btn btn-outline-secondary">Preview Cleaned</button>
                </div>
              </div>
              <div id="uploadPreviewControls" class="row g-3 mb-3 d-none">
                <div class="col-12 col-md-6">
                  <label class="form-label small">Missing values strategy</label>
                  <select id="uploadMissingStrategy" class="form-select form-select-sm">
                    <option value="none" selected>No automatic fill</option>
                    <option value="fill_zero">Fill zeros</option>
                    <option value="fill_mean">Fill mean</option>
                  </select>
                </div>
                <div class="col-12 col-md-6 d-flex align-items-end">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="uploadRemoveDuplicates" checked>
                    <label class="form-check-label" for="uploadRemoveDuplicates">Remove duplicate rows</label>
                  </div>
                </div>
              </div>

              <div id="uploadPreviewArea" class="border rounded-3 p-3 bg-white small text-muted">Select a CSV file and click Preview Data to inspect rows and cleaning effects.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary" id="uploadSaveBtn">Save to Workspace</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="/Data/assets/js/datasets_workspace.js"></script>
  <script src="/Data/assets/js/datasets.js"></script>
  <script src="/Data/assets/js/datasets_upload.js"></script>
</body>
</html>
