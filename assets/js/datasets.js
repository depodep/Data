document.addEventListener('DOMContentLoaded', () => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const grid = document.getElementById('datasetsGrid');
  const pagination = document.getElementById('datasetsPagination');
  const searchInput = document.getElementById('searchDatasets');
  const filterScope = document.getElementById('filterScope');
  const perPageSelect = document.getElementById('perPage');
  const openUpload = document.getElementById('openUpload');
  const uploadModalEl = document.getElementById('uploadModal');
  const uploadModal = uploadModalEl ? new bootstrap.Modal(uploadModalEl) : null;
  const uploadForm = document.getElementById('uploadForm');

  let currentPage = 1;

  const load = async () => {
    const params = new URLSearchParams({
      page: String(currentPage),
      per_page: perPageSelect.value,
      search: searchInput.value.trim(),
    });

    if (filterScope && filterScope.value) params.set('scope', filterScope.value);

    const res = await fetch('/Data/api/datasets/list.php?' + params.toString(), { headers: { 'X-CSRF-Token': csrf } });
    const json = await res.json();
    if (!json.success) return;

    grid.innerHTML = json.data.map(ds => `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${escapeHtml(ds.dataset_name)}</h5>
            <p class="text-muted small mb-2">by ${escapeHtml(ds.owner_name ?? 'Unknown')}</p>
            <p class="mb-2">${escapeHtml(ds.dataset_description || '')}</p>
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <div class="small text-muted">${ds.record_count} rows</div>
              <div>
                <a class="btn btn-sm btn-outline-primary" href="${escapeHtml(ds.file_path)}" download>Download</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    const meta = json.meta;
    pagination.innerHTML = '';
    if (meta.total_pages > 1) {
      for (let p = 1; p <= meta.total_pages; p++) {
        const li = document.createElement('li');
        li.className = 'page-item ' + (p === meta.page ? 'active' : '');
        li.innerHTML = `<button class="page-link" data-page="${p}">${p}</button>`;
        pagination.appendChild(li);
      }

      pagination.querySelectorAll('button[data-page]').forEach(btn => btn.addEventListener('click', () => {
        currentPage = Number(btn.dataset.page);
        load();
      }));
    }
  };

  const escapeHtml = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

  if (openUpload) openUpload.addEventListener('click', () => uploadModal.show());

  if (uploadForm) uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(uploadForm);
    const res = await fetch('/Data/api/datasets/upload.php', { method: 'POST', body: formData, headers: { 'X-CSRF-Token': csrf } });
    const json = await res.json();
    if (!json.success) {
      alert(json.message || 'Upload failed');
      return;
    }
    uploadModal.hide();
    load();
    alert(json.message || 'Uploaded');
  });

  if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; load(); });
  if (perPageSelect) perPageSelect.addEventListener('change', () => { currentPage = 1; load(); });
  if (filterScope) filterScope.addEventListener('change', () => { currentPage = 1; load(); });

  load();
});
document.addEventListener('DOMContentLoaded', () => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const grid = document.getElementById('datasetsGrid');
  const meta = document.getElementById('datasetsMeta');
  const pagination = document.getElementById('datasetsPagination');
  const alertBox = document.getElementById('datasetsAlert');
  const searchInput = document.getElementById('searchDatasets');
  const statusFilter = document.getElementById('statusFilter');
  const scopeFilter = document.getElementById('scopeFilter');
  const perPageSelect = document.getElementById('perPageDatasets');
  const uploadModal = new bootstrap.Modal(document.getElementById('uploadDatasetModal'));
  const uploadButton = document.getElementById('openUploadDataset');
  const uploadForm = document.getElementById('uploadDatasetForm');
  const previewBtn = document.getElementById('previewDatasetBtn');
  const cleanBtn = document.getElementById('cleanDatasetBtn');
  const fileInput = document.getElementById('dataset_file');
  const previewArea = document.getElementById('datasetPreviewArea');
  const previewTable = document.getElementById('datasetPreviewTable');

  let currentPage = 1;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const showAlert = (message, type = 'success') => {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
    window.setTimeout(() => alertBox.classList.add('d-none'), 3000);
  };

  const statusBadge = (status) => {
    const map = {
      uploaded: 'secondary',
      validated: 'info',
      cleaned: 'primary',
      analyzed: 'success',
      predicted: 'warning',
      archived: 'dark',
    };
    return map[status] || 'secondary';
  };

  const scopeBadge = (scope) => {
    const map = {
      private: 'secondary',
      shared: 'info',
      public: 'success',
    };
    return map[scope] || 'secondary';
  };

  const renderPagination = (metaData) => {
    pagination.innerHTML = '';

    if (metaData.total_pages <= 1) return;

    const buttons = [];
    if (currentPage > 1) buttons.push({ label: 'Previous', page: currentPage - 1 });
    for (let page = 1; page <= metaData.total_pages; page += 1) {
      buttons.push({ label: String(page), page, active: page === currentPage });
    }
    if (currentPage < metaData.total_pages) buttons.push({ label: 'Next', page: currentPage + 1 });

    pagination.innerHTML = buttons.map((button) => `
      <li class="page-item ${button.active ? 'active' : ''}">
        <button class="page-link" data-page="${button.page}">${button.label}</button>
      </li>
    `).join('');

    pagination.querySelectorAll('button[data-page]').forEach((button) => {
      button.addEventListener('click', () => {
        currentPage = Number(button.dataset.page);
        loadDatasets();
      });
    });
  };

  const loadDatasets = async () => {
    const params = new URLSearchParams({
      search: searchInput.value.trim(),
      status: statusFilter.value,
      scope: scopeFilter.value,
      page: String(currentPage),
      per_page: perPageSelect.value,
    });

    const response = await fetch(`/Data/api/datasets/list.php?${params.toString()}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    });
    const result = await response.json();

    grid.innerHTML = result.data.length === 0
      ? '<div class="col-12"><div class="card border-0 shadow-sm"><div class="card-body text-center text-muted py-5">No datasets found.</div></div></div>'
      : result.data.map((dataset) => `
        <div class="col-12 col-md-6 col-xl-4">
          <div class="dataset-card card border-0 shadow-sm h-100" data-dataset-id="${dataset.dataset_id}">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h2 class="h5 mb-1">${escapeHtml(dataset.dataset_name)}</h2>
                  <div class="text-muted small">${escapeHtml(dataset.owner_name)}</div>
                </div>
                <span class="badge text-bg-${statusBadge(dataset.processing_status)}">${escapeHtml(dataset.processing_status)}</span>
              </div>
              <p class="text-muted small flex-grow-1">${escapeHtml(dataset.dataset_description || 'No description provided.')}</p>
              <div class="d-flex flex-wrap gap-2 mb-3">
                <span class="badge text-bg-light text-dark">${escapeHtml(dataset.file_type)}</span>
                <span class="badge text-bg-light text-dark">${escapeHtml(dataset.record_count)} records</span>
              </div>
              <div class="small text-muted">
                <div>Uploaded: ${escapeHtml(dataset.uploaded_at)}</div>
                <div>Columns: ${escapeHtml(dataset.column_count)}</div>
              </div>
            </div>
          </div>
        </div>
      `).join('');

    // make cards clickable
    const vizModalEl = document.getElementById('vizOptionsModal');
    const vizModal = vizModalEl ? new bootstrap.Modal(vizModalEl) : null;
    const vizName = document.getElementById('vizDatasetName');
    const openWorkspaceBtn = document.getElementById('openWorkspaceBtn');

    grid.querySelectorAll('.dataset-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        const id = card.dataset.datasetId;
        const title = card.querySelector('.h5')?.textContent || card.querySelector('h2')?.textContent || 'Dataset';
        if (vizModal) {
          if (vizName) vizName.textContent = title;
          if (openWorkspaceBtn) openWorkspaceBtn.href = `/Data/pages/datasets/workspace.php?dataset_id=${id}`;
          vizModal.show();
        } else {
          if (id) window.location.href = `/Data/pages/datasets/workspace.php?dataset_id=${id}`;
        }
      });
    });

    meta.textContent = `Showing ${result.data.length} of ${result.meta.total} datasets`;
    renderPagination(result.meta);
  };

  uploadButton.addEventListener('click', () => uploadModal.show());
  [searchInput, statusFilter, scopeFilter, perPageSelect].forEach((element) => {
    element.addEventListener('input', () => {
      currentPage = 1;
      loadDatasets();
    });
    element.addEventListener('change', () => {
      currentPage = 1;
      loadDatasets();
    });
  });

  let storedName = null;

  const renderPreview = (preview) => {
    if (!preview || !preview.header) return;
    previewArea.classList.remove('d-none');
    const hdr = preview.header.map(h => `<th>${escapeHtml(h)}</th>`).join('');
    const rows = preview.rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
    previewTable.innerHTML = `
      <table class="table table-sm table-striped">
        <thead><tr>${hdr}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  };

  previewBtn.addEventListener('click', async () => {
    if (!fileInput.files || fileInput.files.length === 0) { showAlert('Please choose a CSV file first.', 'warning'); return; }
    const fd = new FormData();
    fd.append('dataset', fileInput.files[0]);
    fd.append('mode', 'preview');
    fd.append('csrf_token', csrfToken);

    const resp = await fetch('/Data/api/datasets/upload.php', { method: 'POST', body: fd, headers: { 'X-CSRF-Token': csrfToken } });
    const json = await resp.json();
    if (!json.success) { showAlert(json.message || 'Preview failed.', 'danger'); return; }
    storedName = json.stored;
    renderPreview(json.preview);
    showAlert('Preview loaded. Use Clean & Preview to run cleaning.', 'info');
  });

  cleanBtn.addEventListener('click', async () => {
    if (!storedName) { showAlert('No uploaded file to clean. Preview first.', 'warning'); return; }
    const fd = new FormData();
    fd.append('stored', storedName);
    fd.append('mode', 'clean');
    fd.append('csrf_token', csrfToken);

    const resp = await fetch('/Data/api/datasets/upload.php', { method: 'POST', body: fd, headers: { 'X-CSRF-Token': csrfToken } });
    const json = await resp.json();
    if (!json.success) { showAlert(json.message || 'Cleaning failed.', 'danger'); return; }
    storedName = json.cleaned || storedName;
    renderPreview(json.preview);
    showAlert('Cleaning completed. Review preview then Upload.', 'success');
  });

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(uploadForm);
    formData.set('csrf_token', csrfToken);
    if (storedName && (!fileInput.files || fileInput.files.length === 0)) {
      // finalize using stored file
      formData.append('stored', storedName);
    } else if (fileInput.files && fileInput.files.length > 0) {
      // include file
      formData.set('dataset_file', fileInput.files[0]);
    }

    const response = await fetch('/Data/api/datasets/upload.php', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: formData,
    });

    const result = await response.json();

    if (!result.success) {
      showAlert(result.message || 'Upload failed.', 'danger');
      return;
    }

    uploadModal.hide();
    uploadForm.reset();
    previewArea.classList.add('d-none');
    previewTable.innerHTML = '';
    storedName = null;
    showAlert(result.message, 'success');
    currentPage = 1;
    loadDatasets();
  });

  loadDatasets();
});
