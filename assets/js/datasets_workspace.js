document.addEventListener('DOMContentLoaded', () => {
  const bootstrapModal = window.bootstrap;
  const hasChartJs = typeof window.Chart !== 'undefined';
  let workspaceModalInstance = null;

  const state = {
    datasetId: Number(window.__WORKSPACE_DATASET_ID || window.__DATASET_ID || window.__DATASET_META?.dataset_id || 0),
    meta: window.__WORKSPACE_DATASET_META || window.__DATASET_META || {},
    preview: [],
    previewColumns: [],
    previewView: [],
    previewSearch: '',
    previewSortKey: '',
    previewSortDir: 'asc',
    previewPage: 1,
    previewPerPage: 5,
    analysis: null,
    visualCharts: [],
    chartInstances: [],
    predictionsPath: null,
    cleaningSummary: null,
    lastAnalysisAt: null,
  };

  const els = {
    modalEl: document.getElementById('vizOptionsModal'),
    workspaceAlert: document.getElementById('workspaceAlert'),
    previewArea: document.getElementById('previewArea'),
    previewMeta: document.getElementById('workspacePreviewMeta'),
    columnInfo: document.getElementById('workspaceColumnInfo'),
    summaryRows: document.getElementById('workspaceSummaryRows'),
    summaryColumns: document.getElementById('workspaceSummaryColumns'),
    summaryNumeric: document.getElementById('workspaceSummaryNumeric'),
    summaryCategorical: document.getElementById('workspaceSummaryCategorical'),
    summaryMissing: document.getElementById('workspaceSummaryMissing'),
    summaryDuplicates: document.getElementById('workspaceSummaryDuplicates'),
    sidebarRows: document.getElementById('workspaceSidebarRows'),
    sidebarColumns: document.getElementById('workspaceSidebarColumns'),
    sidebarMissing: document.getElementById('workspaceSidebarMissing'),
    sidebarDuplicates: document.getElementById('workspaceSidebarDuplicates'),
    chartsGenerated: document.getElementById('workspaceChartsGenerated'),
    predictionStatus: document.getElementById('workspacePredictionStatus'),
    lastAnalysis: document.getElementById('workspaceLastAnalysisTime'),
    datasetStatus: document.getElementById('workspaceDatasetStatus'),
    datasetName: document.getElementById('vizDatasetName'),
    datasetSubtitle: document.getElementById('vizDatasetSubtitle'),
    datasetOwner: document.getElementById('vizDatasetOwner'),
    datasetDate: document.getElementById('vizDatasetDate'),
    datasetRows: document.getElementById('vizDatasetRows'),
    datasetColumns: document.getElementById('vizDatasetColumns'),
    datasetSize: document.getElementById('vizDatasetSize'),
    openWorkspaceBtn: document.getElementById('openWorkspaceBtn'),
    runCleanBtn: document.getElementById('runCleanBtn'),
    previewCleanBtn: document.getElementById('previewCleanBtn'),
    runAnalyzeBtn: document.getElementById('runAnalyzeBtn'),
    runVisualBtn: document.getElementById('runVisualBtn'),
    runPredictBtn: document.getElementById('runPredictBtn'),
    resetPredictBtn: document.getElementById('resetPredictBtn'),
    workspaceAnalyzeBtn: document.getElementById('workspaceAnalyzeBtn'),
    workspaceVisualizeBtn: document.getElementById('workspaceVisualizeBtn'),
    workspaceMachineLearningBtn: document.getElementById('workspaceMachineLearningBtn'),
    workspaceExportResultsBtn: document.getElementById('workspaceExportResultsBtn'),
    cleanOutput: document.getElementById('cleanOutput'),
    analysisOutput: document.getElementById('analysisOutput'),
    visualOutput: document.getElementById('visualOutput'),
    predictOutput: document.getElementById('predictOutput'),
    analysisStatsGrid: document.getElementById('analysisStatsGrid'),
    analysisInsights: document.getElementById('analysisInsights'),
    analysisCorrelation: document.getElementById('analysisCorrelation'),
    predictionMatrix: document.getElementById('predictionMatrix'),
    predictTarget: document.getElementById('predictTarget'),
    predictFeatures: document.getElementById('predictFeatures'),
    predictModel: document.getElementById('predictModel'),
    predictionAccuracy: document.getElementById('predictionAccuracy'),
    predictionR2: document.getElementById('predictionR2'),
    predictionMae: document.getElementById('predictionMae'),
    predictionRmse: document.getElementById('predictionRmse'),
    rowsRemoved: document.getElementById('workspaceRowsRemoved'),
    duplicatesRemoved: document.getElementById('workspaceDuplicatesRemoved'),
    valuesFixed: document.getElementById('workspaceValuesFixed'),
    cleaningSuccess: document.getElementById('workspaceCleaningSuccess'),
    cleaningMissing: document.getElementById('workspaceCleaningMissing'),
    cleaningDuplicates: document.getElementById('workspaceCleaningDuplicates'),
    cleaningInconsistent: document.getElementById('workspaceCleaningInconsistent'),
    cleaningInvalid: document.getElementById('workspaceCleaningInvalid'),
    downloadCleanedCsvBtn: document.getElementById('downloadCleanedCsvBtn'),
    downloadAnalysisPdfBtn: document.getElementById('downloadAnalysisPdfBtn'),
    downloadChartsBtn: document.getElementById('downloadChartsBtn'),
    downloadPredictionResultsBtn: document.getElementById('downloadPredictionResultsBtn'),
  };

  if (els.modalEl && bootstrapModal?.Modal) {
    workspaceModalInstance = bootstrapModal.Modal.getOrCreateInstance(els.modalEl);
  }

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatNumber = (value, digits = 2) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(digits) : '-';
  };

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

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

  const showAlert = (message, type = 'info') => {
    if (!els.workspaceAlert) return;
    els.workspaceAlert.className = `alert alert-${type} shadow-sm mb-4`;
    els.workspaceAlert.textContent = message;
    els.workspaceAlert.classList.remove('d-none');
  };

  const clearAlert = () => {
    if (!els.workspaceAlert) return;
    els.workspaceAlert.classList.add('d-none');
  };

  const getRows = () => {
    const rows = [...state.preview];
    const filtered = state.previewSearch
      ? rows.filter((row) => state.previewColumns.some((column) => String(row[column] ?? '').toLowerCase().includes(state.previewSearch.toLowerCase())))
      : rows;

    if (state.previewSortKey) {
      filtered.sort((left, right) => {
        const aValue = left[state.previewSortKey];
        const bValue = right[state.previewSortKey];
        const aNum = toNumber(aValue);
        const bNum = toNumber(bValue);
        let result = 0;
        if (aNum !== null && bNum !== null) {
          result = aNum - bNum;
        } else {
          result = String(aValue ?? '').localeCompare(String(bValue ?? ''));
        }
        return state.previewSortDir === 'asc' ? result : -result;
      });
    }

    return filtered;
  };

  const inferColumnType = (column) => {
    const sampleValues = state.preview.map((row) => row[column]).filter((value) => value !== null && value !== undefined && value !== '');
    const numericValues = sampleValues.filter((value) => toNumber(value) !== null);
    return numericValues.length >= Math.max(1, sampleValues.length * 0.6) ? 'Numeric' : 'Categorical';
  };

  const computeSummary = () => {
    const columns = state.previewColumns;
    const rows = state.preview;
    const numericColumns = columns.filter((column) => inferColumnType(column) === 'Numeric');
    const categoricalColumns = columns.filter((column) => inferColumnType(column) === 'Categorical');
    const missingValues = rows.reduce((total, row) => total + columns.reduce((missing, column) => missing + (row[column] === null || row[column] === undefined || row[column] === '' ? 1 : 0), 0), 0);
    const signatures = new Set(rows.map((row) => JSON.stringify(columns.map((column) => row[column] ?? null))));
    const duplicateRows = Math.max(0, rows.length - signatures.size);

    return {
      numericColumns: numericColumns.length,
      categoricalColumns: categoricalColumns.length,
      missingValues,
      duplicateRows,
    };
  };

  const updateSummaryCards = () => {
    const summary = computeSummary();
    const rows = state.meta.record_count ?? state.preview.length;
    const columns = state.meta.column_count ?? state.previewColumns.length;

    [els.summaryRows, els.sidebarRows].forEach((node) => { if (node) node.textContent = String(rows ?? '-'); });
    [els.summaryColumns, els.sidebarColumns].forEach((node) => { if (node) node.textContent = String(columns ?? '-'); });
    if (els.summaryNumeric) els.summaryNumeric.textContent = String(summary.numericColumns);
    if (els.summaryCategorical) els.summaryCategorical.textContent = String(summary.categoricalColumns);
    if (els.summaryMissing) els.summaryMissing.textContent = String(summary.missingValues);
    if (els.summaryDuplicates) els.summaryDuplicates.textContent = String(summary.duplicateRows);
    if (els.sidebarMissing) els.sidebarMissing.textContent = String(summary.missingValues);
    if (els.sidebarDuplicates) els.sidebarDuplicates.textContent = String(summary.duplicateRows);
    if (els.cleaningMissing) els.cleaningMissing.textContent = String(summary.missingValues);
    if (els.cleaningDuplicates) els.cleaningDuplicates.textContent = String(summary.duplicateRows);
    if (els.cleaningInconsistent) els.cleaningInconsistent.textContent = summary.categoricalColumns > 0 ? 'Needs review' : 'Low';
    if (els.cleaningInvalid) els.cleaningInvalid.textContent = summary.numericColumns > 0 ? 'Possible' : 'None';
    if (els.previewMeta) els.previewMeta.textContent = `Total records: ${rows ?? '-'}`;
  };

  const updateHeader = () => {
    const name = state.meta.dataset_name || 'Dataset Analysis Workspace';
    if (els.datasetName) els.datasetName.textContent = name;
    if (els.datasetSubtitle) els.datasetSubtitle.textContent = 'Analyze, clean, visualize, and generate insights from the uploaded dataset.';
    if (els.datasetOwner) els.datasetOwner.textContent = `Owner: ${state.meta.owner_name || 'Unknown'}`;
    if (els.datasetDate) els.datasetDate.textContent = `Uploaded: ${formatDate(state.meta.uploaded_at)}`;
    if (els.datasetRows) els.datasetRows.textContent = `Rows: ${state.meta.record_count ?? '-'}`;
    if (els.datasetColumns) els.datasetColumns.textContent = `Columns: ${state.meta.column_count ?? '-'}`;
    if (els.datasetSize) els.datasetSize.textContent = `File Size: ${formatFileSize(state.meta.file_size)}`;
    if (els.datasetStatus) els.datasetStatus.textContent = state.meta.processing_status || 'Idle';
    if (els.chartsGenerated) els.chartsGenerated.textContent = String(state.visualCharts.length || 0);
    if (els.lastAnalysis) els.lastAnalysis.textContent = state.lastAnalysisAt ? state.lastAnalysisAt.toLocaleString() : '-';
    if (els.openWorkspaceBtn && state.meta.dataset_id) {
      els.openWorkspaceBtn.href = `/Data/pages/datasets/workspace.php?dataset_id=${state.meta.dataset_id}`;
    }
  };

  const buildColumnInfo = () => {
    if (!els.columnInfo) return;
    const rows = state.preview;
    els.columnInfo.innerHTML = state.previewColumns.map((column) => {
      const values = rows.map((row) => row[column]).filter((value) => value !== null && value !== undefined && value !== '');
      const uniqueValues = new Set(values.map((value) => String(value))).size;
      const missingCount = rows.length - values.length;
      const sampleData = values.length ? String(values[0]) : '-';
      return `
        <div class="col-12 col-md-6 col-xl-4">
          <div class="card border-0 shadow-sm workspace-section-card h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div>
                  <h6 class="mb-1">${escapeHtml(column)}</h6>
                  <div class="text-muted small">${escapeHtml(inferColumnType(column))}</div>
                </div>
                <span class="badge text-bg-light text-dark">${uniqueValues} unique</span>
              </div>
              <div class="small text-muted mb-1">${missingCount} missing</div>
              <div class="small text-muted mb-1">${uniqueValues} unique values</div>
              <div class="small">Sample: <span class="fw-semibold">${escapeHtml(sampleData)}</span></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  const renderPreview = () => {
    if (!els.previewArea) return;
    const rows = getRows();
    const total = rows.length;
    const pageCount = Math.max(1, Math.ceil(total / state.previewPerPage));
    if (state.previewPage > pageCount) state.previewPage = pageCount;
    const start = (state.previewPage - 1) * state.previewPerPage;
    const visibleRows = rows.slice(start, start + state.previewPerPage);
    const columns = state.previewColumns;

    const sortIndicator = (column) => {
      if (state.previewSortKey !== column) return '<i class="bi bi-arrow-down-up ms-1 text-muted"></i>';
      return state.previewSortDir === 'asc' ? '<i class="bi bi-sort-up ms-1"></i>' : '<i class="bi bi-sort-down ms-1"></i>';
    };

    els.previewArea.innerHTML = `
      <div class="workspace-preview-controls p-3">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-lg-6">
            <label class="form-label small mb-1" for="workspacePreviewSearch">Search</label>
            <input type="search" id="workspacePreviewSearch" class="form-control" placeholder="Search preview rows" value="${escapeHtml(state.previewSearch)}">
          </div>
          <div class="col-6 col-lg-3">
            <label class="form-label small mb-1" for="workspacePreviewPerPage">Rows per page</label>
            <select id="workspacePreviewPerPage" class="form-select">
              <option value="5" ${state.previewPerPage === 5 ? 'selected' : ''}>5</option>
              <option value="10" ${state.previewPerPage === 10 ? 'selected' : ''}>10</option>
              <option value="20" ${state.previewPerPage === 20 ? 'selected' : ''}>20</option>
            </select>
          </div>
          <div class="col-6 col-lg-3 text-lg-end text-muted small">
            Showing ${visibleRows.length ? start + 1 : 0}-${Math.min(start + visibleRows.length, total)} of ${total}
          </div>
        </div>
      </div>
      <div class="workspace-preview-table">
        <table class="table table-hover table-striped mb-0 align-middle">
          <thead class="table-light position-sticky top-0">
            <tr>
              ${columns.map((column) => `<th role="button" data-sort-key="${escapeHtml(column)}" class="text-nowrap">${escapeHtml(column)}${sortIndicator(column)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${visibleRows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? '')}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="d-flex justify-content-between align-items-center gap-2 px-3 py-3 flex-wrap">
        <div class="text-muted small">First 20 rows shown from the uploaded dataset. Total records: ${state.meta.record_count ?? total}</div>
        <nav>
          <ul class="pagination mb-0">
            <li class="page-item ${state.previewPage === 1 ? 'disabled' : ''}"><button class="page-link" data-page="${state.previewPage - 1}" ${state.previewPage === 1 ? 'disabled' : ''}>Previous</button></li>
            ${Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => `<li class="page-item ${page === state.previewPage ? 'active' : ''}"><button class="page-link" data-page="${page}">${page}</button></li>`).join('')}
            <li class="page-item ${state.previewPage === pageCount ? 'disabled' : ''}"><button class="page-link" data-page="${state.previewPage + 1}" ${state.previewPage === pageCount ? 'disabled' : ''}>Next</button></li>
          </ul>
        </nav>
      </div>
    `;

    const searchInput = document.getElementById('workspacePreviewSearch');
    const perPageSelect = document.getElementById('workspacePreviewPerPage');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.previewSearch = searchInput.value.trim();
        state.previewPage = 1;
        renderPreview();
      });
    }
    if (perPageSelect) {
      perPageSelect.addEventListener('change', () => {
        state.previewPerPage = Number(perPageSelect.value);
        state.previewPage = 1;
        renderPreview();
      });
    }
    els.previewArea.querySelectorAll('th[data-sort-key]').forEach((headerCell) => {
      headerCell.addEventListener('click', () => {
        const sortKey = headerCell.dataset.sortKey || '';
        if (!sortKey) return;
        if (state.previewSortKey === sortKey) {
          state.previewSortDir = state.previewSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.previewSortKey = sortKey;
          state.previewSortDir = 'asc';
        }
        renderPreview();
      });
    });
    els.previewArea.querySelectorAll('button[data-page]').forEach((button) => {
      button.addEventListener('click', () => {
        const page = Number(button.dataset.page);
        if (!Number.isFinite(page) || page < 1 || page > pageCount) return;
        state.previewPage = page;
        renderPreview();
      });
    });
  };

  const renderAnalysis = () => {
    if (!state.analysis) return;

    const stats = state.analysis.numeric_stats || {};
    if (els.analysisStatsGrid) {
      els.analysisStatsGrid.innerHTML = Object.entries(stats).map(([column, values]) => `
        <div class="col-12 col-md-6 col-xxl-4">
          <div class="card border-0 shadow-sm workspace-stat-card h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <h6 class="mb-1">${escapeHtml(column)}</h6>
                  <div class="text-muted small">Descriptive statistics</div>
                </div>
                <span class="badge text-bg-primary-subtle text-primary-emphasis">Numeric</span>
              </div>
              <div class="row g-2 small">
                <div class="col-6"><div class="workspace-mini-kpi p-2"><div class="text-muted small">Mean</div><div class="fw-semibold">${formatNumber(values.mean)}</div></div></div>
                <div class="col-6"><div class="workspace-mini-kpi p-2"><div class="text-muted small">Median</div><div class="fw-semibold">${formatNumber(values.median)}</div></div></div>
                <div class="col-6"><div class="workspace-mini-kpi p-2"><div class="text-muted small">Mode</div><div class="fw-semibold">${formatNumber(values.mode)}</div></div></div>
                <div class="col-6"><div class="workspace-mini-kpi p-2"><div class="text-muted small">Count</div><div class="fw-semibold">${escapeHtml(values.count ?? '-')}</div></div></div>
                <div class="col-6"><div class="workspace-mini-kpi p-2"><div class="text-muted small">Minimum</div><div class="fw-semibold">${formatNumber(values.min)}</div></div></div>
                <div class="col-6"><div class="workspace-mini-kpi p-2"><div class="text-muted small">Maximum</div><div class="fw-semibold">${formatNumber(values.max)}</div></div></div>
                <div class="col-6"><div class="workspace-mini-kpi p-2"><div class="text-muted small">Std Dev</div><div class="fw-semibold">${formatNumber(values.std)}</div></div></div>
                <div class="col-6"><div class="workspace-mini-kpi p-2"><div class="text-muted small">Variance</div><div class="fw-semibold">${formatNumber((Number(values.std) || 0) ** 2)}</div></div></div>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    if (els.analysisInsights) {
      const insights = state.analysis.insights || [];
      els.analysisInsights.innerHTML = insights.length
        ? insights.map((insight, index) => `<div class="alert alert-info mb-0 shadow-sm"><strong>Insight ${index + 1}:</strong> ${escapeHtml(insight)}</div>`).join('')
        : '<div class="alert alert-light border mb-0">No insights were generated for this dataset.</div>';
    }

    if (els.analysisCorrelation) {
      const correlation = state.analysis.correlation || null;
      if (correlation) {
        const columns = Object.keys(correlation);
        els.analysisCorrelation.innerHTML = `
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr><th></th>${columns.map((column) => `<th class="text-nowrap">${escapeHtml(column)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${columns.map((rowName) => `<tr><th class="text-nowrap">${escapeHtml(rowName)}</th>${columns.map((colName) => {
                  const value = correlation[rowName]?.[colName];
                  const numeric = Number(value);
                  const intensity = Number.isFinite(numeric) ? Math.min(1, Math.abs(numeric)) : 0;
                  const bg = numeric >= 0 ? `rgba(37, 99, 235, ${0.08 + intensity * 0.35})` : `rgba(239, 68, 68, ${0.08 + intensity * 0.35})`;
                  return `<td style="background:${bg}">${Number.isFinite(numeric) ? numeric.toFixed(2) : '-'}</td>`;
                }).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        els.analysisCorrelation.innerHTML = '<div class="workspace-chart-placeholder text-muted small">No correlation data available.</div>';
      }
    }

    if (els.analysisOutput) {
      els.analysisOutput.textContent = JSON.stringify(state.analysis, null, 2);
    }
  };

  const updateCleaningReport = (summary) => {
    state.cleaningSummary = summary;
    if (!summary) return;
    const rowsRemoved = Math.max(0, Number(summary.before_rows || 0) - Number(summary.after_rows || 0));
    const duplicatesRemoved = Number(summary.removed_duplicates || 0);
    const valuesFixed = Object.entries(summary.missing_before || {}).reduce((total, [column, before]) => {
      const after = Number(summary.missing_after?.[column] || 0);
      return total + Math.max(0, Number(before) - after);
    }, 0);
    const denominator = Number(summary.before_rows || 0) || 1;
    const successRate = Math.max(0, Math.min(100, ((Number(summary.after_rows || 0) / denominator) * 100)));

    if (els.rowsRemoved) els.rowsRemoved.textContent = String(rowsRemoved);
    if (els.duplicatesRemoved) els.duplicatesRemoved.textContent = String(duplicatesRemoved);
    if (els.valuesFixed) els.valuesFixed.textContent = String(valuesFixed);
    if (els.cleaningSuccess) els.cleaningSuccess.textContent = `${successRate.toFixed(1)}%`;
    if (els.cleanOutput) els.cleanOutput.textContent = JSON.stringify(summary, null, 2);
    if (els.sidebarMissing) els.sidebarMissing.textContent = String(Object.values(summary.missing_after || {}).reduce((total, value) => total + Number(value || 0), 0));
  };

  const destroyCharts = () => {
    state.chartInstances.forEach((chart) => chart.destroy());
    state.chartInstances = [];
  };

  const makeDistribution = (values, bins = 8) => {
    const numeric = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    if (!numeric.length) return { labels: [], counts: [] };
    const min = Math.min(...numeric);
    const max = Math.max(...numeric);
    if (min === max) return { labels: [String(min)], counts: [numeric.length] };
    const step = (max - min) / bins;
    const counts = new Array(bins).fill(0);
    numeric.forEach((value) => {
      let index = Math.floor((value - min) / step);
      if (index >= bins) index = bins - 1;
      counts[index] += 1;
    });
    const labels = counts.map((_, index) => `${(min + step * index).toFixed(1)}-${(min + step * (index + 1)).toFixed(1)}`);
    return { labels, counts };
  };

  const renderChartCard = (chartDef, index) => {
    const cardId = `chart-card-${index}`;
    return `
      <div class="col-12 col-lg-6 col-xxl-4 workspace-chart-card-wrap" data-chart-card="${cardId}">
        <div class="card border-0 shadow-sm workspace-chart-card h-100" id="${cardId}">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h6 class="mb-1">${escapeHtml(chartDef.title)}</h6>
                <p class="workspace-generate-note mb-0">${escapeHtml(chartDef.description)}</p>
              </div>
              <span class="badge text-bg-light text-dark">Chart.js</span>
            </div>
            <div class="workspace-chart-placeholder flex-grow-1 mb-3">
              <canvas id="${chartDef.canvasId}" height="220"></canvas>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-sm btn-outline-primary" data-chart-download="${chartDef.canvasId}">Download PNG</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" data-chart-expand="${cardId}">Expand</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderCharts = () => {
    if (!els.visualOutput) return;
    destroyCharts();

    const numericColumns = state.previewColumns.filter((column) => inferColumnType(column) === 'Numeric');
    const categoricalColumns = state.previewColumns.filter((column) => inferColumnType(column) === 'Categorical');
    const firstNumeric = numericColumns[0];
    const secondNumeric = numericColumns[1] || numericColumns[0];
    const firstCategorical = categoricalColumns[0];
    const rows = state.preview;

    const chartDefs = [];
    if (firstCategorical) {
      const counts = rows.reduce((accumulator, row) => {
        const key = String(row[firstCategorical] ?? 'Unknown');
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
      }, {});
      const labels = Object.keys(counts).slice(0, 8);
      chartDefs.push({
        title: 'Bar Chart',
        description: `Distribution of ${firstCategorical}.`,
        canvasId: 'chart-bar',
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: firstCategorical, data: labels.map((label) => counts[label]), backgroundColor: 'rgba(37, 99, 235, 0.7)' }],
        },
      });
      chartDefs.push({
        title: 'Pie Chart',
        description: `Category share for ${firstCategorical}.`,
        canvasId: 'chart-pie',
        type: 'pie',
        data: {
          labels,
          datasets: [{ data: labels.map((label) => counts[label]), backgroundColor: ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#8b5cf6'] }],
        },
      });
    }

    if (firstNumeric) {
      const values = rows.map((row) => row[firstNumeric]);
      const distribution = makeDistribution(values);
      chartDefs.push({
        title: 'Line Chart',
        description: `Row-by-row trend for ${firstNumeric}.`,
        canvasId: 'chart-line',
        type: 'line',
        data: {
          labels: rows.map((_, index) => String(index + 1)),
          datasets: [{ label: firstNumeric, data: values.map((value) => Number(value)), borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.18)', tension: 0.35, fill: true }],
        },
      });
      chartDefs.push({
        title: 'Histogram',
        description: `Frequency distribution for ${firstNumeric}.`,
        canvasId: 'chart-histogram',
        type: 'bar',
        data: {
          labels: distribution.labels,
          datasets: [{ label: 'Count', data: distribution.counts, backgroundColor: 'rgba(16, 185, 129, 0.7)' }],
        },
      });
      chartDefs.push({
        title: 'Box Plot',
        description: `Quartile summary for ${firstNumeric}.`,
        canvasId: 'chart-boxplot',
        type: 'bar',
        data: {
          labels: ['Min', 'Q1', 'Median', 'Q3', 'Max'],
          datasets: [{ label: firstNumeric, data: [Math.min(...values.map(Number).filter(Number.isFinite)), 0, 0, 0, Math.max(...values.map(Number).filter(Number.isFinite))], backgroundColor: 'rgba(139, 92, 246, 0.7)' }],
        },
      });
    }

    if (firstNumeric && secondNumeric && firstNumeric !== secondNumeric) {
      chartDefs.push({
        title: 'Scatter Plot',
        description: `Relationship between ${firstNumeric} and ${secondNumeric}.`,
        canvasId: 'chart-scatter',
        type: 'scatter',
        data: {
          datasets: [{
            label: `${firstNumeric} vs ${secondNumeric}`,
            data: rows.map((row) => ({ x: Number(row[firstNumeric]), y: Number(row[secondNumeric]) })).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
          }],
        },
        options: { scales: { x: { title: { display: true, text: firstNumeric } }, y: { title: { display: true, text: secondNumeric } } } },
      });
    }

    if (numericColumns.length >= 2) {
      const labels = numericColumns.slice(0, 5);
      const correlation = labels.map((rowName) => labels.map((columnName) => {
        if (rowName === columnName) return 1;
        const x = rows.map((row) => Number(row[rowName])).filter(Number.isFinite);
        const y = rows.map((row) => Number(row[columnName])).filter(Number.isFinite);
        const minLength = Math.min(x.length, y.length);
        if (!minLength) return 0;
        const xSlice = x.slice(0, minLength);
        const ySlice = y.slice(0, minLength);
        const xMean = xSlice.reduce((sum, value) => sum + value, 0) / minLength;
        const yMean = ySlice.reduce((sum, value) => sum + value, 0) / minLength;
        let numerator = 0;
        let xDen = 0;
        let yDen = 0;
        for (let index = 0; index < minLength; index += 1) {
          const xDiff = xSlice[index] - xMean;
          const yDiff = ySlice[index] - yMean;
          numerator += xDiff * yDiff;
          xDen += xDiff * xDiff;
          yDen += yDiff * yDiff;
        }
        return (xDen && yDen) ? numerator / Math.sqrt(xDen * yDen) : 0;
      }));
      chartDefs.push({
        title: 'Heatmap',
        description: 'Correlation-style heatmap for the strongest numeric fields.',
        canvasId: 'chart-heatmap',
        type: 'heatmap',
        data: { labels, correlation },
      });
    }

    els.visualOutput.innerHTML = chartDefs.map(renderChartCard).join('');
    state.visualCharts = chartDefs;
    if (els.chartsGenerated) els.chartsGenerated.textContent = String(chartDefs.length);

    chartDefs.forEach((chartDef) => {
      const canvas = document.getElementById(chartDef.canvasId);
      if (!canvas) return;
      if (chartDef.type === 'heatmap') {
        const context = canvas.getContext('2d');
        const { labels, correlation } = chartDef.data;
        const size = 280;
        canvas.width = size;
        canvas.height = size;
        const cellSize = size / (labels.length + 1);
        context.clearRect(0, 0, size, size);
        context.font = '12px sans-serif';
        labels.forEach((label, index) => {
          context.fillStyle = '#334155';
          context.fillText(String(label), (index + 1) * cellSize + 10, 14);
          context.fillText(String(label), 4, (index + 1) * cellSize + 16);
        });
        correlation.forEach((row, rowIndex) => {
          row.forEach((value, colIndex) => {
            const intensity = Math.min(1, Math.abs(value));
            context.fillStyle = value >= 0 ? `rgba(37, 99, 235, ${0.15 + intensity * 0.7})` : `rgba(239, 68, 68, ${0.15 + intensity * 0.7})`;
            context.fillRect((colIndex + 1) * cellSize, (rowIndex + 1) * cellSize, cellSize, cellSize);
            context.fillStyle = '#fff';
            context.fillText(value.toFixed(2), (colIndex + 1) * cellSize + 8, (rowIndex + 1) * cellSize + 18);
          });
        });
        return;
      }

      const chart = new window.Chart(canvas, {
        type: chartDef.type,
        data: chartDef.data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: chartDef.type !== 'bar' || chartDef.canvasId === 'chart-bar' || chartDef.canvasId === 'chart-histogram' } },
          ...(chartDef.options || {}),
        },
      });
      state.chartInstances.push(chart);
    });

    els.visualOutput.querySelectorAll('[data-chart-download]').forEach((button) => {
      button.addEventListener('click', () => {
        const canvas = document.getElementById(button.dataset.chartDownload || '');
        if (!canvas) return;
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${state.meta.dataset_name || 'chart'}-${button.dataset.chartDownload}.png`;
        link.click();
      });
    });

    els.visualOutput.querySelectorAll('[data-chart-expand]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = document.getElementById(button.dataset.chartExpand || '');
        if (!card) return;
        const columnWrap = card.closest('[data-chart-card]');
        if (columnWrap) {
          columnWrap.classList.toggle('col-12');
          columnWrap.classList.toggle('col-lg-6');
          columnWrap.classList.toggle('col-xxl-4');
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  const renderPredictionSummary = async (result) => {
    if (!result) return;
    const mse = Number(result.mse);
    const r2 = Number(result.r2);
    const rmse = Number.isFinite(mse) ? Math.sqrt(mse) : null;
    let mae = null;
    let actualVsPred = [];

    if (result.predictions_path) {
      try {
        const response = await fetch(result.predictions_path, { credentials: 'same-origin' });
        if (response.ok) {
          const csv = await response.text();
          const lines = csv.trim().split(/\r?\n/);
          const header = lines.shift()?.split(',') || [];
          const actualColumn = header.find((column) => column.startsWith('actual_'));
          const predictedColumn = header.find((column) => column.startsWith('pred_'));
          if (actualColumn && predictedColumn) {
            actualVsPred = lines.map((line) => {
              const values = line.split(',');
              const record = header.reduce((accumulator, column, index) => {
                accumulator[column] = values[index];
                return accumulator;
              }, {});
              return {
                actual: Number(record[actualColumn]),
                predicted: Number(record[predictedColumn]),
              };
            }).filter((point) => Number.isFinite(point.actual) && Number.isFinite(point.predicted));
            if (actualVsPred.length) {
              mae = actualVsPred.reduce((sum, point) => sum + Math.abs(point.actual - point.predicted), 0) / actualVsPred.length;
            }
          }
        }
      } catch (error) {
        // no-op; leave derived metrics as unavailable
      }
    }

    if (els.predictionAccuracy) els.predictionAccuracy.textContent = Number.isFinite(r2) ? `${(Math.max(0, Math.min(1, r2)) * 100).toFixed(1)}%` : '-';
    if (els.predictionR2) els.predictionR2.textContent = Number.isFinite(r2) ? r2.toFixed(4) : '-';
    if (els.predictionMae) els.predictionMae.textContent = Number.isFinite(mae) ? mae.toFixed(4) : 'n/a';
    if (els.predictionRmse) els.predictionRmse.textContent = Number.isFinite(rmse) ? rmse.toFixed(4) : 'n/a';
    if (els.predictionStatus) els.predictionStatus.textContent = 'Completed';
    if (els.predictOutput) els.predictOutput.textContent = JSON.stringify(result, null, 2);

    if (els.predictionMatrix) {
      if (actualVsPred.length) {
        const data = actualVsPred.slice(0, 50);
        if (state.chartInstances.length) {
          state.chartInstances.forEach((chart) => chart.destroy());
          state.chartInstances = [];
        }
        const canvas = document.createElement('canvas');
        canvas.height = 240;
        els.predictionMatrix.innerHTML = '';
        els.predictionMatrix.appendChild(canvas);
        const chart = new window.Chart(canvas, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Actual vs Predicted',
              data,
              backgroundColor: 'rgba(37, 99, 235, 0.75)',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { title: { display: true, text: 'Actual' } },
              y: { title: { display: true, text: 'Predicted' } },
            },
          },
        });
        state.chartInstances.push(chart);
      } else {
        els.predictionMatrix.innerHTML = '<div class="workspace-chart-placeholder text-muted small">Regression line and prediction comparison will appear after training.</div>';
      }
    }

    if (result.predictions_path) {
      state.predictionsPath = result.predictions_path;
      if (els.downloadPredictionResultsBtn) {
        els.downloadPredictionResultsBtn.onclick = () => {
          const anchor = document.createElement('a');
          anchor.href = result.predictions_path;
          anchor.download = '';
          anchor.click();
        };
      }
    }
  };

  const loadPreview = async () => {
    if (!state.datasetId) return;
    if (els.previewArea) els.previewArea.innerHTML = '<div class="p-4 text-muted">Loading preview…</div>';
    const response = await fetch(`/Data/api/datasets/preview.php?dataset_id=${state.datasetId}&limit=20`, { credentials: 'same-origin' });
    const json = await response.json();
    if (!json.success) {
      if (els.previewArea) els.previewArea.innerHTML = `<div class="p-4 text-danger">${escapeHtml(json.message || 'Failed to load preview')}</div>`;
      return;
    }

    state.previewColumns = json.columns || [];
    state.preview = (json.rows || []).map((row) => {
      if (Array.isArray(row)) {
        return state.previewColumns.reduce((accumulator, column, index) => {
          accumulator[column] = row[index] ?? '';
          return accumulator;
        }, {});
      }
      return row;
    });

    if (!state.previewColumns.length && state.preview.length) {
      state.previewColumns = Object.keys(state.preview[0]);
    }

    buildColumnInfo();
    updateSummaryCards();
    renderPreview();
    renderCharts();
    populatePredictionSelectors();
    updateHeader();
  };

  const populatePredictionSelectors = () => {
    const columns = state.previewColumns;
    if (els.predictTarget) {
      els.predictTarget.innerHTML = ['<option value="">Select target variable</option>']
        .concat(columns.map((column) => `<option value="${escapeHtml(column)}">${escapeHtml(column)}</option>`))
        .join('');
    }
    if (els.predictFeatures) {
      els.predictFeatures.innerHTML = columns.map((column) => `<option value="${escapeHtml(column)}">${escapeHtml(column)}</option>`).join('');
    }
  };

  const loadAnalysis = async () => {
    if (!state.datasetId) return;
    if (els.datasetStatus) els.datasetStatus.textContent = 'Analyzing…';
    const response = await fetch(`/Data/api/analysis/analyze.php?dataset_id=${state.datasetId}`, { credentials: 'same-origin' });
    const json = await response.json();
    if (!json.success) {
      showAlert(json.message || 'Analysis failed', 'danger');
      return;
    }
    state.analysis = json.analysis;
    state.lastAnalysisAt = new Date();
    updateHeader();
    renderAnalysis();
    if (els.datasetStatus) els.datasetStatus.textContent = 'Analyzed';
    if (els.analysisOutput) els.analysisOutput.textContent = JSON.stringify(json.analysis, null, 2);
    if (els.lastAnalysis) els.lastAnalysis.textContent = state.lastAnalysisAt.toLocaleString();
  };

  const loadCleaningPreview = async () => {
    if (!state.datasetId) return;
    const missingStrategy = document.getElementById('missingStrategy')?.value || 'none';
    const removeDuplicates = document.getElementById('optRemoveDuplicates')?.checked ? '1' : '0';
    const response = await fetch(`/Data/api/cleaning/preview.php?dataset_id=${state.datasetId}&remove_duplicates=${removeDuplicates}&missing_strategy=${encodeURIComponent(missingStrategy)}`, { credentials: 'same-origin' });
    const json = await response.json();
    if (!json.success) {
      showAlert(json.message || 'Preview failed', 'danger');
      if (els.cleanOutput) els.cleanOutput.textContent = JSON.stringify(json, null, 2);
      return;
    }
    updateCleaningReport(json.summary || {});
    if (json.rows && json.rows.length) {
      state.preview = json.rows.map((row) => (Array.isArray(row) ? state.previewColumns.reduce((accumulator, column, index) => {
        accumulator[column] = row[index] ?? '';
        return accumulator;
      }, {}) : row));
      renderPreview();
    }
  };

  const runCleaning = async () => {
    if (!state.datasetId) return;
    if (els.runCleanBtn) els.runCleanBtn.disabled = true;
    try {
      const form = new FormData();
      form.append('dataset_id', String(state.datasetId));
      form.append('csrf_token', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
      form.append('remove_duplicates', document.getElementById('optRemoveDuplicates')?.checked ? '1' : '0');
      form.append('missing_strategy', document.getElementById('missingStrategy')?.value || 'none');
      const response = await fetch('/Data/api/cleaning/clean.php', { method: 'POST', body: form, credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        showAlert(json.message || 'Cleaning failed', 'danger');
        if (els.cleanOutput) els.cleanOutput.textContent = JSON.stringify(json, null, 2);
        return;
      }
      showAlert('Cleaning completed', 'success');
      updateCleaningReport(json.summary || {});
      if (els.datasetStatus) els.datasetStatus.textContent = 'Cleaned';
      await loadPreview();
    } finally {
      if (els.runCleanBtn) els.runCleanBtn.disabled = false;
    }
  };

  const runVisualizationApi = async () => {
    if (!state.datasetId) return;
    if (els.runVisualBtn) els.runVisualBtn.disabled = true;
    try {
      const response = await fetch(`/Data/api/visualization/visualize.php?dataset_id=${state.datasetId}`, { credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        showAlert(json.message || 'Visualization failed', 'danger');
        return;
      }
      showAlert('Visualization completed', 'success');
      if (els.datasetStatus) els.datasetStatus.textContent = 'Visualized';
      renderCharts();
    } finally {
      if (els.runVisualBtn) els.runVisualBtn.disabled = false;
    }
  };

  const runPrediction = async () => {
    if (!state.datasetId) return;
    const target = els.predictTarget?.value?.trim() || '';
    if (!target) {
      showAlert('Please choose a target variable.', 'warning');
      return;
    }
    if (els.runPredictBtn) els.runPredictBtn.disabled = true;
    try {
      const form = new FormData();
      form.append('dataset_id', String(state.datasetId));
      form.append('target_column', target);
      form.append('model_type', els.predictModel?.value || 'linear_regression');
      Array.from(els.predictFeatures?.selectedOptions || []).forEach((option) => form.append('feature_columns[]', option.value));
      const response = await fetch('/Data/api/prediction/predict.php', { method: 'POST', body: form, credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        showAlert(json.message || 'Prediction failed', 'danger');
        if (els.predictOutput) els.predictOutput.textContent = JSON.stringify(json, null, 2);
        return;
      }
      showAlert('Prediction completed', 'success');
      await renderPredictionSummary(json.result || {});
      if (els.datasetStatus) els.datasetStatus.textContent = 'Predicted';
    } finally {
      if (els.runPredictBtn) els.runPredictBtn.disabled = false;
    }
  };

  const resetPrediction = () => {
    if (els.predictTarget) els.predictTarget.value = '';
    if (els.predictFeatures) {
      Array.from(els.predictFeatures.options).forEach((option) => { option.selected = false; });
    }
    if (els.predictModel) els.predictModel.value = 'linear_regression';
    if (els.predictOutput) els.predictOutput.textContent = 'No predictions yet.';
    if (els.predictionAccuracy) els.predictionAccuracy.textContent = '-';
    if (els.predictionR2) els.predictionR2.textContent = '-';
    if (els.predictionMae) els.predictionMae.textContent = '-';
    if (els.predictionRmse) els.predictionRmse.textContent = '-';
    if (els.predictionMatrix) els.predictionMatrix.innerHTML = '<div class="workspace-chart-placeholder text-muted small">Confusion matrix will appear for classification workflows.</div>';
    if (els.predictionStatus) els.predictionStatus.textContent = 'Not run';
  };

  const openTab = (selector) => {
    const target = document.querySelector(selector);
    if (!target || !bootstrapModal?.Tab) return;
    const tab = bootstrapModal.Tab.getOrCreateInstance(target);
    tab.show();
  };

  const exportAnalysisPdf = async () => {
    try {
      const response = await fetch(`/Data/api/reports/latest.php?dataset_id=${state.datasetId}`, { credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success || !Array.isArray(json.data) || !json.data.length) {
        showAlert('No analysis report is available yet.', 'warning');
        return;
      }
      const latest = json.data.find((report) => report.report_format === 'pdf' || report.file_path);
      if (latest?.file_path) {
        window.open(latest.file_path, '_blank', 'noopener');
      } else {
        showAlert('Analysis report is available, but no PDF path was returned.', 'warning');
      }
    } catch (error) {
      showAlert('Unable to export analysis PDF.', 'danger');
    }
  };

  const downloadAllCharts = () => {
    if (!els.visualOutput) return;
    els.visualOutput.querySelectorAll('canvas').forEach((canvas, index) => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${state.meta.dataset_name || 'dataset'}-chart-${index + 1}.png`;
      link.click();
    });
  };

  const downloadCleanedCsv = () => {
    if (!state.cleaningSummary?.output_path) {
      showAlert('Run cleaning first to generate a cleaned CSV.', 'warning');
      return;
    }
    const link = document.createElement('a');
    link.href = state.cleaningSummary.output_path;
    link.download = '';
    link.click();
  };

  const handleWorkspaceOpen = (dataset) => {
    if (!dataset) return;
    state.datasetId = Number(dataset.dataset_id || dataset.id || state.datasetId || 0);
    state.meta = {
      ...state.meta,
      dataset_id: state.datasetId,
      dataset_name: dataset.dataset_name || dataset.title || state.meta.dataset_name,
      owner_name: dataset.owner_name || state.meta.owner_name,
      record_count: Number(dataset.record_count ?? state.meta.record_count ?? 0),
      column_count: Number(dataset.column_count ?? state.meta.column_count ?? 0),
      uploaded_at: dataset.uploaded_at || state.meta.uploaded_at,
      file_size: dataset.file_size ?? state.meta.file_size,
      processing_status: dataset.processing_status || state.meta.processing_status,
      file_path: dataset.file_path || state.meta.file_path,
    };
    updateHeader();
    updateSummaryCards();
    populatePredictionSelectors();
    workspaceModalInstance?.show();
    if (els.previewArea) els.previewArea.innerHTML = '<div class="p-4 text-muted">Loading preview…</div>';
    loadPreview().catch((error) => showAlert(error.message || 'Failed to load preview', 'danger'));
  };

  const bindEvents = () => {
    els.runCleanBtn?.addEventListener('click', runCleaning);
    els.previewCleanBtn?.addEventListener('click', loadCleaningPreview);
    els.runAnalyzeBtn?.addEventListener('click', loadAnalysis);
    els.runVisualBtn?.addEventListener('click', runVisualizationApi);
    els.runPredictBtn?.addEventListener('click', runPrediction);
    els.resetPredictBtn?.addEventListener('click', resetPrediction);
    els.workspaceAnalyzeBtn?.addEventListener('click', () => openTab('#tab-analysis'));
    els.workspaceVisualizeBtn?.addEventListener('click', () => openTab('#tab-visual'));
    els.workspaceMachineLearningBtn?.addEventListener('click', () => openTab('#tab-ml'));
    els.workspaceExportResultsBtn?.addEventListener('click', () => openTab('#tab-export'));
    els.downloadCleanedCsvBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      downloadCleanedCsv();
    });
    els.downloadAnalysisPdfBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      exportAnalysisPdf();
    });
    els.downloadChartsBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      downloadAllCharts();
    });
  };

  const handleWorkspaceEvent = (event) => {
    handleWorkspaceOpen(event.detail || {});
  };

  document.addEventListener('dataset-workspace-open', handleWorkspaceEvent);
  window.addEventListener('dataset-workspace-open', handleWorkspaceEvent);

  bindEvents();
  updateHeader();

  if (state.datasetId) {
    loadPreview().then(() => loadCleaningPreview()).catch((error) => showAlert(error.message || 'Workspace failed to load', 'danger'));
  }

  window.DatasetWorkspace = {
    open: handleWorkspaceOpen,
    refreshPreview: loadPreview,
    runAnalysis: loadAnalysis,
    runVisualization: runVisualizationApi,
    runPrediction,
  };
});
