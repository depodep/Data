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
  <script src="/Data/assets/js/datasets.js"></script>
</body>
</html>
<?php


require_once __DIR__ . '/../../includes/bootstrap.php';

require_role(['administrator', 'teacher']);

$user = current_user();
$csrfToken = csrf_token();
$isAdministrator = ($user['role_slug'] ?? '') === 'administrator';
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?php echo e($csrfToken); ?>">
    <title>Dataset Library | <?php echo e(APP_NAME); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
    <link href="/Data/assets/css/app.css" rel="stylesheet">
</head>
<body class="app-library-shell">
    <nav class="navbar navbar-expand-lg navbar-dark app-navbar px-3">
        <a class="navbar-brand fw-semibold" href="/Data/pages/dashboard/index.php"><?php echo e(APP_NAME); ?></a>
        <div class="ms-auto d-flex gap-2 flex-wrap">
            <a class="btn btn-outline-light btn-sm" href="/Data/pages/dashboard/index.php">Dashboard</a>
            <?php if ($isAdministrator): ?>
                <a class="btn btn-outline-light btn-sm" href="/Data/pages/admin/users/index.php">Users</a>
            <?php endif; ?>
            <a class="btn btn-outline-light btn-sm" href="/Data/pages/auth/logout.php">Logout</a>
        </div>
    </nav>

    <main class="container-fluid py-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
                <p class="text-uppercase text-info fw-semibold small mb-1">Dataset Library</p>
                <h1 class="h3 mb-0">Search, filter, upload, and manage dataset cards</h1>
            </div>
            <div class="d-flex gap-2 flex-wrap">
                <a class="btn btn-outline-secondary" href="/Data/api/datasets/template.php">
                    <i class="fa-solid fa-file-arrow-down me-2"></i>Download Template
                </a>
                <button class="btn btn-primary" id="openUploadDataset">
                    <i class="fa-solid fa-upload me-2"></i>Upload Dataset
                </button>
            </div>
        </div>

        <div id="datasetsAlert" class="alert d-none" role="alert"></div>

        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body">
                <div class="row g-3 align-items-end">
                    <div class="col-12 col-md-5">
                        <label class="form-label" for="searchDatasets">Search</label>
                        <input type="search" class="form-control" id="searchDatasets" placeholder="Search by dataset name, owner, or filename">
                    </div>
                    <div class="col-6 col-md-2">
                        <label class="form-label" for="statusFilter">Status</label>
                        <select class="form-select" id="statusFilter">
                            <option value="">All</option>
                            <option value="uploaded">Uploaded</option>
                            <option value="validated">Validated</option>
                            <option value="cleaned">Cleaned</option>
                            <option value="analyzed">Analyzed</option>
                            <option value="predicted">Predicted</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                    <div class="col-6 col-md-2">
                        <label class="form-label" for="scopeFilter">Scope</label>
                        <select class="form-select" id="scopeFilter">
                            <option value="">All</option>
                            <option value="private">Private</option>
                            <option value="shared">Shared</option>
                            <option value="public">Public</option>
                        </select>
                    </div>
                    <div class="col-12 col-md-3">
                        <label class="form-label" for="perPageDatasets">Cards per page</label>
                        <select class="form-select" id="perPageDatasets">
                            <option value="6">6</option>
                            <option value="12" selected>12</option>
                            <option value="18">18</option>
                            <option value="24">24</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-4" id="datasetsGrid"></div>

        <div class="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-2">
            <div class="text-muted small" id="datasetsMeta"></div>
            <nav>
                <ul class="pagination mb-0" id="datasetsPagination"></ul>
            </nav>
        </div>
    </main>

    <!-- Visualization Options Modal -->
    <div class="modal fade" id="vizOptionsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Visualization</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p id="vizDatasetName" class="fw-semibold"></p>
            <p class="mb-2">Choose a visualization type to view the dataset:</p>
            <ul class="list-group">
              <li class="list-group-item">Bar Chart</li>
              <li class="list-group-item">Line Chart</li>
              <li class="list-group-item">Pie Chart</li>
              <li class="list-group-item">Histogram</li>
              <li class="list-group-item">Scatter Plot</li>
            </ul>
          </div>
          <div class="modal-footer">
            <a id="openWorkspaceBtn" class="btn btn-primary" href="#">Open Workspace</a>
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="uploadDatasetModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <form id="uploadDatasetForm" enctype="multipart/form-data" novalidate>
                    <div class="modal-header">
                        <h5 class="modal-title">Upload Dataset</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" name="csrf_token" value="<?php echo e($csrfToken); ?>">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label" for="dataset_name">Dataset Name</label>
                                <input type="text" class="form-control" name="dataset_name" id="dataset_name" required>
                            </div>
                            <input type="hidden" name="shared_scope" id="shared_scope" value="private">
                            <div class="col-12">
                              <div class="form-text">Datasets are private by default. A preview will appear after selecting a file.</div>
                            </div>
                            <div class="col-12">
                                <label class="form-label" for="dataset_description">Description</label>
                                <textarea class="form-control" name="dataset_description" id="dataset_description" rows="3"></textarea>
                            </div>
                            <div class="col-12">
                              <label class="form-label" for="dataset_file">CSV File</label>
                              <input type="file" class="form-control" name="dataset_file" id="dataset_file" accept=".csv,text/csv" required>
                              <div class="form-text">Upload a CSV that matches the system template exactly.</div>
                            </div>
                            <div class="col-12">
                              <div id="datasetPreviewArea" class="mt-3 d-none">
                                <h6>Preview (first 10 rows)</h6>
                                <div id="datasetPreviewTable" style="max-height:300px;overflow:auto"></div>
                              </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                      <button type="button" id="previewDatasetBtn" class="btn btn-secondary">Preview</button>
                      <button type="button" id="cleanDatasetBtn" class="btn btn-warning">Clean & Preview</button>
                      <button type="submit" class="btn btn-primary">Upload Dataset</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/Data/assets/js/datasets.js"></script>
</body>
</html>
