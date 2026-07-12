document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const state = {
    page: 1,
    perPage: 10,
    search: '',
    myDatasets: urlParams.get('filter') === 'my',
    status: urlParams.get('status') === 'archived' ? 'archived' : '',
    totalPages: 1,
    datasetsById: new Map(),
    userRole: '',
  };

  const els = {
    grid: document.getElementById('datasetsGrid'),
    pagination: document.getElementById('datasetsPagination'),
    search: document.getElementById('searchDatasets'),
    perPage: document.getElementById('perPage'),
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const formatFileSize = (bytes) => {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size < 0) return '-';
    if (size < 1024) return `${size} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = size / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
  };

  const buildDatasetCard = (dataset) => {
    const title = escapeHtml(dataset.dataset_name || dataset.source_filename || 'Untitled Dataset');
    const description = escapeHtml(dataset.dataset_description || 'No description available.');
    const owner = escapeHtml(dataset.owner_name || 'Unknown');
    const rows = Number(dataset.record_count || 0);
    const columns = Number(dataset.column_count || 0);
    const status = escapeHtml(dataset.processing_status || 'Idle');
    const uploaded = dataset.uploaded_at ? new Date(dataset.uploaded_at).toLocaleDateString() : '-';

    return `
      <div class="col-12 col-md-6 col-xl-4">
        <article class="card border-0 shadow-sm h-100 dataset-card" data-dataset-id="${escapeHtml(dataset.dataset_id)}" role="button" tabindex="0">
          <div class="card-body d-flex flex-column">
            <div class="mb-3">
              <h5 class="card-title mb-2">${title}</h5>
              <p class="text-muted small mb-2">by ${owner}</p>
              <p class="text-muted small mb-3">${description}</p>
            </div>

            <div class="mb-3 text-muted small">
              <div>Rows: ${rows}</div>
              <div>Columns: ${columns}</div>
              <div>Status: ${status}</div>
              <div>Uploaded: ${uploaded}</div>
            </div>

            <div class="mt-auto d-grid gap-2">
              <button type="button" class="btn btn-primary btn-sm view-dataset-btn" data-dataset-id="${escapeHtml(dataset.dataset_id)}">View Data Sets</button>
              ${dataset.processing_status === 'uploaded' ? `<button type="button" class="btn btn-success btn-sm import-dataset-btn" data-dataset-id="${escapeHtml(dataset.dataset_id)}">Import Records</button>` : ''}
              ${dataset.processing_status === 'validated' && state.userRole === 'administrator' ? `<button type="button" class="btn btn-warning btn-sm unimport-dataset-btn" data-dataset-id="${escapeHtml(dataset.dataset_id)}">Un-import Records</button>` : ''}
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-secondary btn-sm flex-fill edit-dataset-btn" data-dataset-id="${escapeHtml(dataset.dataset_id)}">Edit</button>
                ${state.userRole === 'administrator' ? `<button type="button" class="btn btn-outline-danger btn-sm flex-fill remove-dataset-btn" data-dataset-id="${escapeHtml(dataset.dataset_id)}">Remove</button>` : ''}
              </div>
            </div>
          </div>
        </article>
      </div>
    `;
  };

  const renderPagination = () => {
    if (!els.pagination) return;

    const pages = [];
    for (let page = 1; page <= state.totalPages; page += 1) {
      pages.push(`
        <li class="page-item ${page === state.page ? 'active' : ''}">
          <button class="page-link" type="button" data-page="${page}">${page}</button>
        </li>
      `);
    }

    els.pagination.innerHTML = `
      <li class="page-item ${state.page === 1 ? 'disabled' : ''}">
        <button class="page-link" type="button" data-page="${Math.max(1, state.page - 1)}">Previous</button>
      </li>
      ${pages.join('')}
      <li class="page-item ${state.page === state.totalPages ? 'disabled' : ''}">
        <button class="page-link" type="button" data-page="${Math.min(state.totalPages, state.page + 1)}">Next</button>
      </li>
    `;

    els.pagination.querySelectorAll('button[data-page]').forEach((button) => {
      button.addEventListener('click', () => {
        const page = Number(button.dataset.page);
        if (!Number.isFinite(page) || page < 1 || page > state.totalPages) return;
        state.page = page;
        loadDatasets();
      });
    });
  };

  const openDataset = (dataset) => {
    if (!dataset) {
      return;
    }
    if (window.DatasetWorkspace?.open) {
      window.DatasetWorkspace.open(dataset);
      return;
    }
    const datasetId = Number(dataset.dataset_id || dataset.id || 0);
    if (Number.isFinite(datasetId) && datasetId > 0) {
      window.location.href = `/Data/pages/datasets/workspace.php?id=${datasetId}`;
    }
  };

  const bindCardActions = () => {
    if (!els.grid) return;

    const openById = (datasetId) => {
      if (!Number.isFinite(datasetId) || datasetId <= 0) return;
      const dataset = state.datasetsById.get(datasetId);
      if (!dataset) return;
      openDataset(dataset);
    };

    els.grid.querySelectorAll('.dataset-card').forEach((card) => {
      card.addEventListener('click', () => {
        openById(Number(card.dataset.datasetId));
      });

      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openById(Number(card.dataset.datasetId));
      });
    });

    els.grid.querySelectorAll('.view-dataset-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openById(Number(button.dataset.datasetId));
      });
    });

    els.grid.querySelectorAll('.edit-dataset-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const datasetId = Number(button.dataset.datasetId);
        const dataset = state.datasetsById.get(datasetId);
        if (!dataset) return;
        
        document.getElementById('editDatasetId').value = dataset.dataset_id;
        document.getElementById('editDatasetName').value = dataset.dataset_name || dataset.source_filename || '';
        document.getElementById('editDatasetDescription').value = dataset.dataset_description || '';
        
        const modalEl = document.getElementById('editDatasetModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      });
    });

    els.grid.querySelectorAll('.remove-dataset-btn').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const datasetId = Number(button.dataset.datasetId);
        if (!confirm('Are you sure you want to remove this dataset? This action cannot be undone.')) return;
        
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
          const formData = new FormData();
          formData.append('dataset_id', String(datasetId));
          formData.append('csrf_token', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
          const response = await fetch('/Data/api/datasets/delete.php', { method: 'POST', body: formData });
          const json = await response.json();
          if (json.success) {
            loadDatasets();
          } else {
            alert(json.message || 'Error removing dataset');
            button.disabled = false;
            button.innerHTML = originalText;
          }
        } catch (e) {
          alert('Error removing dataset');
          button.disabled = false;
          button.innerHTML = originalText;
        }
      });
    });

    els.grid.querySelectorAll('.import-dataset-btn').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const datasetId = Number(button.dataset.datasetId);
        if (!confirm('Are you sure you want to import this dataset? This will save the rows to the database so students can see their data.')) return;
        
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
          const formData = new FormData();
          formData.append('dataset_id', String(datasetId));
          formData.append('csrf_token', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
          const response = await fetch('/Data/api/datasets/import.php', { method: 'POST', body: formData });
          const json = await response.json();
          if (json.success) {
            alert('Dataset imported successfully.');
            loadDatasets();
          } else {
            alert(json.message || 'Error importing dataset');
            button.disabled = false;
            button.innerHTML = originalText;
          }
        } catch (e) {
          alert('Error importing dataset');
          button.disabled = false;
          button.innerHTML = originalText;
        }
      });
    });

    els.grid.querySelectorAll('.unimport-dataset-btn').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const datasetId = Number(button.dataset.datasetId);
        if (!confirm('Are you sure you want to un-import this dataset? This will remove all its records from the database (students will no longer see them), but the uploaded file will be kept.')) return;
        
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
          const formData = new FormData();
          formData.append('dataset_id', String(datasetId));
          formData.append('csrf_token', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
          const response = await fetch('/Data/api/datasets/unimport.php', { method: 'POST', body: formData });
          const json = await response.json();
          if (json.success) {
            alert('Records removed from database successfully.');
            loadDatasets();
          } else {
            alert(json.message || 'Error removing records');
            button.disabled = false;
            button.innerHTML = originalText;
          }
        } catch (e) {
          alert('Error removing records');
          button.disabled = false;
          button.innerHTML = originalText;
        }
      });
    });
  };

  const loadDatasets = async () => {
    if (!els.grid) return;
    els.grid.innerHTML = '<div class="col-12"><div class="p-4 text-center text-muted">Loading datasets…</div></div>';

    const params = new URLSearchParams({
      page: String(state.page),
      per_page: String(state.perPage),
      search: state.search,
    });
    if (state.myDatasets) {
      params.set('my_datasets', '1');
    }
    if (state.status) {
      params.set('status', state.status);
    }

    try {
      const response = await fetch(`/Data/api/datasets/list.php?${params.toString()}`, { credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        els.grid.innerHTML = `<div class="col-12"><div class="p-4 text-center text-danger">${escapeHtml(json.message || 'Unable to load datasets.')}</div></div>`;
        return;
      }

      const rows = Array.isArray(json.data) ? json.data : [];
      state.userRole = json.meta?.user_role || '';
      state.datasetsById = new Map(rows.map((dataset) => [Number(dataset.dataset_id), dataset]));
      if (!rows.length) {
        els.grid.innerHTML = '<div class="col-12"><div class="p-4 text-center text-muted">No datasets found for this filter.</div></div>';
      } else {
        els.grid.innerHTML = rows.map(buildDatasetCard).join('');
        bindCardActions();
      }

      state.totalPages = Number(json.meta?.total_pages || 1);
      renderPagination();
    } catch (error) {
      els.grid.innerHTML = `<div class="col-12"><div class="p-4 text-center text-danger">${escapeHtml(error.message || 'Unable to load datasets.')}</div></div>`;
    }
  };

  if (els.search) {
    els.search.addEventListener('input', () => {
      state.search = els.search.value.trim();
      state.page = 1;
      loadDatasets();
    });
  }

  if (els.perPage) {
    els.perPage.addEventListener('change', () => {
      state.perPage = Number(els.perPage.value) || 10;
      state.page = 1;
      loadDatasets();
    });
  }

  if (urlParams.get('upload') === '1') {
    const openUploadBtn = document.getElementById('openUpload');
    if (openUploadBtn) {
      setTimeout(() => openUploadBtn.click(), 400);
    }
  }

  const injectEditModal = () => {
    if (document.getElementById('editDatasetModal')) return;
    const modalHtml = `
      <div class="modal fade" id="editDatasetModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit Dataset</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="editDatasetForm">
                <input type="hidden" id="editDatasetId" name="dataset_id">
                <div class="mb-3">
                  <label class="form-label">Dataset Name</label>
                  <input type="text" class="form-control" id="editDatasetName" name="dataset_name" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" id="editDatasetDescription" name="dataset_description" rows="3"></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="saveDatasetBtn">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('saveDatasetBtn').addEventListener('click', async () => {
      const form = document.getElementById('editDatasetForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (!confirm('Are you sure you want to save these changes?')) return;

      const btn = document.getElementById('saveDatasetBtn');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
      
      try {
        const formData = new FormData(form);
        formData.append('csrf_token', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
        const response = await fetch('/Data/api/datasets/update.php', { method: 'POST', body: formData });
        const json = await response.json();
        if (json.success) {
          bootstrap.Modal.getInstance(document.getElementById('editDatasetModal'))?.hide();
          loadDatasets();
        } else {
          alert(json.message || 'Error updating dataset');
        }
      } catch (e) {
        alert('Error updating dataset');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  };

  injectEditModal();
  loadDatasets();
});
