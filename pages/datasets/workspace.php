<?php
declare(strict_types=1);

require_once __DIR__ . '/../../includes/bootstrap.php';

require_login();

$datasetId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($datasetId <= 0) {
    redirect('/Data/pages/datasets/index.php');
}

$stmt = db()->prepare('SELECT d.*, u.full_name AS owner_name FROM datasets d LEFT JOIN users u ON u.user_id = d.owner_user_id WHERE d.dataset_id = :dataset_id LIMIT 1');
$stmt->execute(['dataset_id' => $datasetId]);
$dataset = $stmt->fetch();

if ($dataset === false) {
    redirect('/Data/pages/datasets/index.php');
}

$csrf = csrf_token();
$user = current_user();
$canImport = user_has_role(['administrator','teacher']) && ($dataset['processing_status'] === 'uploaded' || $dataset['processing_status'] === 'validated');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="<?php echo e($csrf); ?>">
  <title>Dataset Workspace | <?php echo e(APP_NAME); ?></title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="/Data/assets/css/app.css" rel="stylesheet">
</head>
<body class="app-dataset-workspace">
  <nav class="navbar navbar-expand-lg navbar-dark app-navbar px-3">
    <a class="navbar-brand fw-semibold" href="/Data/pages/dashboard/index.php"><?php echo e(APP_NAME); ?></a>
    <div class="ms-auto d-flex gap-2">
      <a class="btn btn-outline-light btn-sm" href="/Data/pages/datasets/index.php">Back to Library</a>
      <a class="btn btn-outline-light btn-sm" href="/Data/pages/auth/logout.php">Logout</a>
    </div>
  </nav>

  <main class="container py-4">
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <h1 class="h4 mb-1"><?php echo e($dataset['dataset_name']); ?></h1>
        <p class="text-muted mb-0">Uploaded by <?php echo e($dataset['owner_name'] ?? 'Unknown'); ?> • Status: <?php echo e($dataset['processing_status']); ?> • Records: <?php echo e((int)$dataset['record_count']); ?></p>
      </div>
      <div class="d-flex gap-2">
        <?php if ($canImport): ?>
          <button id="importBtn" class="btn btn-primary">Import Records</button>
        <?php endif; ?>
        <a class="btn btn-outline-secondary" href="<?php echo e($dataset['file_path']); ?>" download>Download CSV</a>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <ul class="nav nav-tabs mb-3" id="workspaceTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="tab-preview" data-bs-toggle="tab" data-bs-target="#pane-preview" type="button" role="tab">Preview</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="tab-clean" data-bs-toggle="tab" data-bs-target="#pane-clean" type="button" role="tab">Cleaning</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="tab-analysis" data-bs-toggle="tab" data-bs-target="#pane-analysis" type="button" role="tab">Analysis</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="tab-visual" data-bs-toggle="tab" data-bs-target="#pane-visual" type="button" role="tab">Visualization</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="tab-predict" data-bs-toggle="tab" data-bs-target="#pane-predict" type="button" role="tab">Prediction</button>
          </li>
        </ul>

        <div class="tab-content">
          <div class="tab-pane fade show active" id="pane-preview" role="tabpanel">
            <h5 class="card-title">Preview (first 10 rows)</h5>
            <div id="previewArea">Loading preview…</div>
          </div>

          <div class="tab-pane fade" id="pane-clean" role="tabpanel">
            <h5 class="card-title">Cleaning</h5>
            <p class="text-muted">Run automatic cleaning using the Python cleaning engine.</p>
            <?php if ($canImport): ?>
              <div class="d-flex gap-2 mb-3">
                <button id="runCleanBtn" class="btn btn-outline-primary">Run Cleaning</button>
                <button id="previewCleanBtn" class="btn btn-outline-secondary">Preview Cleaned</button>
              </div>
            <?php else: ?>
              <div class="alert alert-secondary">Cleaning is available after upload and for authorized users.</div>
            <?php endif; ?>
            <div class="row">
              <div class="col-12 col-lg-6">
                <label class="form-label">Missing values strategy</label>
                <select id="missingStrategy" class="form-select mb-2">
                  <option value="none">None</option>
                  <option value="fill_zero">Fill zeros</option>
                  <option value="fill_mean">Fill mean</option>
                </select>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="optRemoveDuplicates" checked>
                  <label class="form-check-label" for="optRemoveDuplicates">Remove duplicates</label>
                </div>
              </div>
              <div class="col-12 col-lg-6">
                <h6 class="mt-2">Cleaning output</h6>
                <pre id="cleanOutput" class="p-3 bg-light small">No output yet.</pre>
              </div>
            </div>
          </div>

          <div class="tab-pane fade" id="pane-analysis" role="tabpanel">
            <h5 class="card-title">Statistical Analysis</h5>
            <p class="text-muted">Run basic descriptive analysis on numeric columns.</p>
            <button id="runAnalyzeBtn" class="btn btn-outline-secondary mb-3">Run Analysis</button>
            <pre id="analysisOutput" class="p-3 bg-light small">No analysis yet.</pre>
          </div>

          <div class="tab-pane fade" id="pane-visual" role="tabpanel">
            <h5 class="card-title">Visualization</h5>
            <p class="text-muted">Generate charts for the dataset.</p>
            <button id="runVisualBtn" class="btn btn-outline-secondary mb-3">Generate Charts</button>
            <div id="visualOutput" class="d-flex flex-wrap gap-3"></div>
          </div>

          <div class="tab-pane fade" id="pane-predict" role="tabpanel">
            <h5 class="card-title">Prediction</h5>
            <p class="text-muted">Run a simple prediction model. Provide the numeric target column name.</p>
            <div class="row g-2 align-items-center mb-3">
              <div class="col-auto">
                <input id="predictTarget" class="form-control" placeholder="Target column name">
              </div>
              <div class="col-auto">
                <button id="runPredictBtn" class="btn btn-outline-danger">Run Prediction</button>
              </div>
            </div>
            <pre id="predictOutput" class="p-3 bg-light small">No predictions yet.</pre>
          </div>
        </div>
      </div>
    </div>

    <div id="workspaceAlert" class="alert d-none" role="alert"></div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script>
    window.__DATASET_ID = <?php echo json_encode($datasetId, JSON_NUMERIC_CHECK); ?>;
    window.__DATASET_META = <?php echo json_encode([
      'dataset_id' => (int) $dataset['dataset_id'],
      'dataset_name' => $dataset['dataset_name'],
      'owner_name' => $dataset['owner_name'] ?? null,
      'record_count' => (int) $dataset['record_count'],
      'column_count' => (int) $dataset['column_count'],
      'uploaded_at' => $dataset['uploaded_at'] ?? null,
      'file_path' => $dataset['file_path'] ?? null,
      'file_size' => isset($dataset['file_size']) ? (int) $dataset['file_size'] : null,
      'processing_status' => $dataset['processing_status'] ?? null,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK); ?>;
  </script>
  <script src="/Data/assets/js/datasets_workspace.js"></script>
</body>
</html>
