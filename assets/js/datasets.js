document.addEventListener('DOMContentLoaded', () => {
  const state = {
    page: 1,
    perPage: 10,
    search: '',
    scope: '',
    totalPages: 1,
  };

  const els = {
    grid: document.getElementById('datasetsGrid'),
    pagination: document.getElementById('datasetsPagination'),
    search: document.getElementById('searchDatasets'),
    scope: document.getElementById('filterScope'),
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
    const scope = escapeHtml(dataset.shared_scope || 'private');
    const status = escapeHtml(dataset.processing_status || 'Idle');
    const uploaded = dataset.uploaded_at ? new Date(dataset.uploaded_at).toLocaleDateString() : '-';

    return `
      <div class="col-12 col-md-6 col-xl-4">
        <article class="card border-0 shadow-sm h-100 dataset-card" data-dataset-id="${escapeHtml(dataset.dataset_id)}">
          <div class="card-body d-flex flex-column">
            <div class="mb-3">
              <h5 class="card-title mb-2">${title}</h5>
              <p class="text-muted small mb-2">by ${owner}</p>
              <p class="text-muted small mb-3">${description}</p>
            </div>

            <div class="mb-3 text-muted small">
              <div>Rows: ${rows}</div>
              <div>Columns: ${columns}</div>
              <div>Scope: ${scope}</div>
              <div>Status: ${status}</div>
              <div>Uploaded: ${uploaded}</div>
            </div>

            <div class="mt-auto d-grid gap-2">
              <button type="button" class="btn btn-primary btn-sm view-dataset-btn" data-dataset-id="${escapeHtml(dataset.dataset_id)}">View Dataset</button>
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
    if (!dataset || !window.DatasetWorkspace?.open) {
      return;
    }
    window.DatasetWorkspace.open(dataset);
  };

  const bindCardActions = () => {
    if (!els.grid) return;

    els.grid.querySelectorAll('.dataset-card').forEach((card) => {
      card.addEventListener('click', () => {
        const datasetId = Number(card.dataset.datasetId);
        if (!Number.isFinite(datasetId) || datasetId <= 0) return;
        const datasetName = card.querySelector('.card-title')?.textContent || '';
        const ownerText = card.querySelector('.text-muted small')?.textContent || '';
        const dataset = { dataset_id: datasetId, dataset_name: datasetName, owner_name: ownerText };
        openDataset(dataset);
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
    if (state.scope) {
      params.set('scope', state.scope);
    }

    try {
      const response = await fetch(`/Data/api/datasets/list.php?${params.toString()}`, { credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        els.grid.innerHTML = `<div class="col-12"><div class="p-4 text-center text-danger">${escapeHtml(json.message || 'Unable to load datasets.')}</div></div>`;
        return;
      }

      const rows = Array.isArray(json.data) ? json.data : [];
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

  if (els.scope) {
    els.scope.addEventListener('change', () => {
      state.scope = els.scope.value;
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

  loadDatasets();
});
