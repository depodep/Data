<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

$csrf = csrf_token();
$user = current_user();
$displayName = $user['full_name'] ?? 'User';

$activePage = 'datasets';
$activeSubPage = 'upload';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="<?php echo e($csrf); ?>">
  <title>Upload Dataset | <?php echo e(APP_NAME); ?></title>
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
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
          <div>
            <h1 class="h3 mb-1">Dataset Preparation</h1>
            <p class="text-muted mb-0">Upload, validate, and prepare datasets with guided recommendations before moving to analysis.</p>
          </div>
          <div class="d-flex gap-2">
            <a class="btn btn-outline-secondary" href="/Data/pages/datasets/index.php">Back to Library</a>
            <a class="btn btn-outline-secondary" href="/Data/api/datasets/template.php" download="dataset_template.csv">Download Template</a>
          </div>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-3 align-items-center">
              <div class="col-md-8">
                <div class="d-flex flex-wrap align-items-center gap-3">
                  <div class="badge bg-primary rounded-pill py-2 px-3">1 Upload Dataset</div>
                  <div class="badge bg-secondary rounded-pill py-2 px-3" id="stepCheckDataset">2 Check Dataset</div>
                  <div class="badge bg-secondary rounded-pill py-2 px-3" id="stepDataPrep">3 Data Preparation</div>
                </div>
              </div>
              <div class="col-md-4 text-md-end">
                <span class="badge bg-info text-dark">Professional Data Preparation Workflow</span>
              </div>
            </div>
          </div>
        </div>

        <div id="uploadAlert" class="alert d-none mt-3" role="alert"></div>

        <div class="row gy-4">
          <div class="col-xl-4">
            <div class="card border-0 shadow-sm mb-4">
              <div class="card-body">
                <h5 class="card-title">Upload Dataset</h5>
                <p class="text-muted small">Select your CSV file and start the validation check immediately.</p>

                <form id="uploadPageForm" enctype="multipart/form-data">
                  <input type="hidden" name="csrf_token" value="<?php echo e($csrf); ?>">
                  <input type="hidden" name="stored" id="uploadStored">

                  <div class="mb-3">
                    <label class="form-label">Dataset file</label>
                    <input type="file" id="uploadDatasetFile" name="dataset" class="form-control" accept=".csv">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Dataset name <span class="text-danger">*</span></label>
                    <input type="text" name="dataset_name" id="uploadDatasetName" class="form-control" placeholder="Enter dataset name">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea name="description" id="uploadDescription" class="form-control" rows="3" placeholder="Optional description"></textarea>
                  </div>
                </form>

                <button type="button" id="startValidationBtn" class="btn btn-primary w-100">Start Validation</button>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-4 d-none" id="validationSummaryCard">
              <div class="card-body">
                <h5 class="card-title">Validation Summary</h5>
                <p class="text-muted small">Quick summary of dataset shape and issues before preparation.</p>
                <div class="row g-3" id="validationSummaryCards"></div>
              </div>
            </div>


          </div>

          <div class="col-xl-8">
            <div class="card border-0 shadow-sm mb-4 d-none" id="validationErrorsCard">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 class="card-title mb-1">Detected Issues</h5>
                    <p class="text-muted small mb-0">Click an issue to highlight the affected row.</p>
                  </div>
                  <span class="badge bg-warning text-dark" id="errorsCountBadge">0 issues</span>
                </div>
                <div class="table-responsive" style="max-height:380px; overflow:auto;">
                  <table class="table table-sm table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th class="text-nowrap">Row Number</th>
                        <th class="text-nowrap">Column Name</th>
                        <th>Current Value</th>
                        <th>Issue</th>
                        <th>Suggested Rule</th>
                        <th class="text-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody id="validationErrorsTable"></tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-4 d-none" id="rawPreviewCard">
              <div class="card-body">
                <div class="mb-3">
                  <h5 class="card-title mb-1">Check Dataset</h5>
                  <p class="text-muted small mb-0">Edit required and numeric fields directly in the table. Any validation issues are highlighted for correction before saving.</p>
                </div>
                <div id="rawPreviewArea" class="border rounded-3 p-3 bg-white text-muted" style="min-height: 320px;">Check dataset preview appears here.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="row gy-4 mt-3">
          <div class="col-12">
            <div class="card border-0 shadow-sm mb-4 d-none" id="preparationCard">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 class="card-title mb-1">Data Preparation</h5>
                    <p class="text-muted small mb-0">Apply missing value and duplicate handling rules to numeric columns only.</p>
                  </div>
                  <span class="badge bg-primary">Guided</span>
                </div>
                <div class="row g-3 mb-3" id="preparationControls"></div>

                <div class="row g-3 mb-3">
                  <div class="col-12 d-flex gap-2 justify-content-end">
                    <button type="button" id="resetPreparationBtn" class="btn btn-outline-danger">Undo</button>
                    <button type="button" id="previewPreparationBtn" class="btn btn-outline-primary">Preview</button>
                  </div>
                </div>

                <div>
                  <h6>Prepared Dataset Preview</h6>
                  <div id="datasetPreviewArea" class="border rounded-3 p-3 bg-white text-muted" style="min-height: 320px;">Preview dataset appears here after applying preparation.</div>
                </div>

                <div id="datasetValidationSummary" class="alert alert-danger d-none mb-3 mt-3" role="alert">Cannot save dataset. Please resolve all inconsistent data first.</div>

                <div class="row g-3 mt-3">
                  <div class="col-12 d-flex justify-content-between align-items-center">
                    <div class="text-muted small">Edit inline cells and click Save Changes to preserve your edits before saving the dataset.</div>
                    <button type="button" id="saveChangesBtn" class="btn btn-outline-secondary">Save Changes</button>
                  </div>
                </div>

                <div class="row g-3 mt-3">
                  <div class="col-12 d-flex justify-content-end">
                    <button type="button" id="applyPreparationBtn" class="btn btn-primary">Apply</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-4 d-none" id="finalOutputCard">
              <div class="card-body">
                <div class="mb-3">
                  <h5 class="card-title mb-1">Final Output</h5>
                  <p class="text-muted small mb-0">Review the committed dataset output before saving.</p>
                </div>
                <div id="finalOutputArea" class="border rounded-3 p-3 bg-white text-muted" style="min-height: 320px;">Final dataset output appears here after applying preparation.</div>
                <div class="d-flex justify-content-end gap-2">
                  <button type="button" id="resetChangesBtn" class="btn btn-outline-danger">Cancel</button>
                  <button type="button" id="saveDatasetBtn" class="btn btn-primary">Save to Dataset</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/Data/assets/js/datasets_upload_page.js"></script>
</body>
</html>
