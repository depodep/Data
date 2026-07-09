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
    analysisLoading: false,
    analysisCharts: [],
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
    predictionSummary: document.getElementById('predictionSummary'),
    cleanOutput: document.getElementById('cleanOutput'),
    analysisOutput: document.getElementById('analysisOutput'),
    visualOutput: document.getElementById('visualOutput'),
    predictOutput: document.getElementById('predictOutput'),
    analysisStatsGrid: document.getElementById('analysisStatsGrid'),
    analysisInsights: document.getElementById('analysisInsights'),
    analysisCorrelation: document.getElementById('analysisCorrelation'),
    analysisStateAlert: document.getElementById('analysisStateAlert'),
    analysisLoading: document.getElementById('analysisLoading'),
    analysisEmptyState: document.getElementById('analysisEmptyState'),
    analysisDashboard: document.getElementById('analysisDashboard'),
    analysisOverallCards: document.getElementById('analysisOverallCards'),
    analysisDescriptiveTable: document.getElementById('analysisDescriptiveTable'),
    analysisCorrelationMatrix: document.getElementById('analysisCorrelationMatrix'),
    analysisCorrelationHeatmap: document.getElementById('analysisCorrelationHeatmap'),
    analysisCorrelationSummary: document.getElementById('analysisCorrelationSummary'),
    analysisTrendCards: document.getElementById('analysisTrendCards'),
    analysisInsightCards: document.getElementById('analysisInsightCards'),
    predictionMatrix: document.getElementById('predictionMatrix'),
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

  const formatAnalysisValue = (value, digits = 2) => {
    if (value === null || value === undefined || value === '') return '—';
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed.toFixed(digits);
    return String(value);
  };

  const EXCLUDED_ANALYSIS_FIELDS = new Set(['student id', 'student name', 'name', 'year level']);
  const EXCLUDED_VISUALIZATION_FIELDS = new Set(['student id', 'student name', 'name', 'year level']);

  const normalizeFieldName = (fieldName) => String(fieldName ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const isExcludedAnalysisField = (fieldName) => EXCLUDED_ANALYSIS_FIELDS.has(normalizeFieldName(fieldName));

  const isExcludedVisualizationField = (fieldName) => EXCLUDED_VISUALIZATION_FIELDS.has(normalizeFieldName(fieldName));

  const analysisBadgeClass = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'text-bg-light text-dark';
    if (numeric >= 0.75) return 'text-bg-success-subtle text-success-emphasis';
    if (numeric >= 0.35) return 'text-bg-primary-subtle text-primary-emphasis';
    if (numeric <= -0.75) return 'text-bg-danger-subtle text-danger-emphasis';
    if (numeric <= -0.35) return 'text-bg-warning-subtle text-warning-emphasis';
    return 'text-bg-light text-dark';
  };

  const analysisStrengthLabel = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'No Correlation';
    const magnitude = Math.abs(numeric);
    if (magnitude >= 0.75) return numeric > 0 ? 'Strong Positive' : 'Strong Negative';
    if (magnitude >= 0.35) return 'Weak';
    return 'No Correlation';
  };

  const destroyAnalysisCharts = () => {
    state.analysisCharts.forEach((chart) => chart.destroy());
    state.analysisCharts = [];
  };

  const getAnalysisData = () => state.analysis || {};

  const getNumericColumns = () => (getAnalysisData().numeric_columns || []).filter((column) => !isExcludedAnalysisField(column));

  const getDescriptiveStatistics = () => (getAnalysisData().descriptive_statistics || [])
    .filter((row) => !isExcludedAnalysisField(row.field));

  const getOverallStatistics = () => getAnalysisData().overall_statistics || null;

  const getCorrelationMatrix = () => {
    const matrix = getAnalysisData().correlation || {};
    const allowedColumns = Object.keys(matrix).filter((column) => !isExcludedAnalysisField(column));
    return allowedColumns.reduce((accumulator, rowName) => {
      accumulator[rowName] = allowedColumns.reduce((rowAccumulator, columnName) => {
        rowAccumulator[columnName] = matrix[rowName]?.[columnName];
        return rowAccumulator;
      }, {});
      return accumulator;
    }, {});
  };

  const getCorrelationSummary = () => {
    const summary = getAnalysisData().correlation_summary || {};
    const filterPairList = (items) => (Array.isArray(items) ? items.filter((item) => (
      !isExcludedAnalysisField(item.first) && !isExcludedAnalysisField(item.second)
    )) : []);
    const strongest = summary.strongest_relationship;
    const weakest = summary.weakest_relationship;

    return {
      strongest_relationship: strongest && !isExcludedAnalysisField(strongest.first) && !isExcludedAnalysisField(strongest.second)
        ? strongest
        : null,
      weakest_relationship: weakest && !isExcludedAnalysisField(weakest.first) && !isExcludedAnalysisField(weakest.second)
        ? weakest
        : null,
      positive_correlations: filterPairList(summary.positive_correlations),
      negative_correlations: filterPairList(summary.negative_correlations),
    };
  };

  const getTrendAnalysis = () => {
    const trendAnalysis = getAnalysisData().trend_analysis || {};
    return Object.entries(trendAnalysis).reduce((accumulator, [fieldName, trendData]) => {
      if (!isExcludedAnalysisField(fieldName)) {
        accumulator[fieldName] = trendData;
      }
      return accumulator;
    }, {});
  };

  const getInsights = () => getAnalysisData().insights || [];

  const hideAnalysisViews = () => {
    ['analysisDashboard', 'analysisLoading'].forEach((key) => {
      if (els[key]) els[key].classList.add('d-none');
    });
  };

  const setAnalysisMessage = (message, type = 'info') => {
    if (!els.analysisStateAlert) return;
    els.analysisStateAlert.className = `alert alert-${type} mb-4`;
    els.analysisStateAlert.textContent = message;
    els.analysisStateAlert.classList.remove('d-none');
  };

  const clearAnalysisMessage = () => {
    if (!els.analysisStateAlert) return;
    els.analysisStateAlert.classList.add('d-none');
  };

  const renderCorrelationCellClass = (value) => {
    const numeric = Number(value);
    const intensity = Number.isFinite(numeric) ? Math.min(1, Math.abs(numeric)) : 0;
    if (numeric >= 0) {
      return `rgba(37, 99, 235, ${0.08 + intensity * 0.62})`;
    }
    return `rgba(239, 68, 68, ${0.08 + intensity * 0.62})`;
  };

  const renderCorrelationMatrix = (matrix) => {
    const columns = Object.keys(matrix || {});
    if (!columns.length) {
      return '<div class="alert alert-light border mb-0">No correlation data is available for this dataset.</div>';
    }

    return `
      <table class="table table-sm table-bordered align-middle mb-0 correlation-table">
        <thead class="table-light">
          <tr>
            <th></th>
            ${columns.map((column) => `<th class="text-nowrap">${escapeHtml(column)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${columns.map((rowName) => `
            <tr>
              <th class="text-nowrap">${escapeHtml(rowName)}</th>
              ${columns.map((colName) => {
                const value = matrix[rowName]?.[colName];
                const numeric = Number(value);
                const badgeClass = analysisBadgeClass(numeric);
                const background = renderCorrelationCellClass(numeric);
                return `<td class="text-center fw-semibold" style="background:${background}"><span class="badge ${badgeClass}">${Number.isFinite(numeric) ? numeric.toFixed(2) : '-'}</span></td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const renderCorrelationHeatmap = (canvas, matrix) => {
    if (!canvas || !window.Chart) return;
    const columns = Object.keys(matrix || {});
    if (!columns.length) return;

    const getCellColor = (value) => {
      const numeric = Number(value);
      const intensity = Number.isFinite(numeric) ? Math.min(1, Math.abs(numeric)) : 0;
      return numeric >= 0
        ? `rgba(37, 99, 235, ${0.15 + intensity * 0.7})`
        : `rgba(239, 68, 68, ${0.15 + intensity * 0.7})`;
    };

    const heatmapPlugin = {
      id: 'analysisHeatmapPainter',
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;

        const width = chartArea.right - chartArea.left;
        const height = chartArea.bottom - chartArea.top;
        const cellSize = Math.min(width, height) / (columns.length + 1);
        const gridStartX = chartArea.left + cellSize;
        const gridStartY = chartArea.top + cellSize;

        ctx.save();
        ctx.clearRect(chartArea.left, chartArea.top, width, height);
        ctx.font = '12px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#334155';

        columns.forEach((label, index) => {
          const x = gridStartX + (index * cellSize) + (cellSize / 2);
          ctx.save();
          ctx.translate(x, chartArea.top + 12);
          ctx.rotate(-Math.PI / 4);
          ctx.fillText(label, 0, 0);
          ctx.restore();

          const y = gridStartY + (index * cellSize) + (cellSize / 2);
          ctx.fillText(label, chartArea.left + 4, y);
        });

        columns.forEach((rowName, rowIndex) => {
          columns.forEach((colName, colIndex) => {
            const value = Number(matrix[rowName]?.[colName] ?? 0);
            const cellX = gridStartX + (colIndex * cellSize);
            const cellY = gridStartY + (rowIndex * cellSize);
            const cellPadding = 2;
            ctx.fillStyle = getCellColor(value);
            ctx.fillRect(cellX + cellPadding, cellY + cellPadding, cellSize - (cellPadding * 2), cellSize - (cellPadding * 2));
            ctx.fillStyle = Math.abs(value) > 0.55 ? '#fff' : '#0f172a';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(Number.isFinite(value) ? value.toFixed(2) : '-', cellX + (cellSize / 2), cellY + (cellSize / 2));
            ctx.font = '12px sans-serif';
          });
        });

        ctx.restore();
      },
    };

    const chart = new window.Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{ data: [] }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
      plugins: [heatmapPlugin],
    });

    state.analysisCharts.push(chart);
  };

  const renderCorrelationSummaryCards = (summary) => {
    const strongest = summary.strongest_relationship;
    const weakest = summary.weakest_relationship;
    const positive = summary.positive_correlations || [];
    const negative = summary.negative_correlations || [];

    const pairList = (items, emptyText) => {
      if (!items.length) return `<div class="text-muted small">${escapeHtml(emptyText)}</div>`;
      return `<div class="d-grid gap-2">${items.slice(0, 3).map((item) => `
        <div class="d-flex justify-content-between align-items-center gap-2">
          <div class="small">${escapeHtml(item.first)} <span class="text-muted">vs</span> ${escapeHtml(item.second)}</div>
          <span class="badge ${analysisBadgeClass(item.value)}">${Number(item.value).toFixed(2)}</span>
        </div>
      `).join('')}</div>`;
    };

    return `
      <div class="col-12 col-md-6 col-xxl-3">
        <div class="card border-0 shadow-sm workspace-section-card h-100"><div class="card-body">
          <h6 class="mb-2">Strongest Relationship</h6>
          ${strongest ? `<div class="fw-semibold">${escapeHtml(strongest.first)} vs ${escapeHtml(strongest.second)}</div><div class="text-muted small">Pearson r ${formatAnalysisValue(strongest.value)}</div>` : '<div class="text-muted small">No paired numeric fields available.</div>'}
        </div></div>
      </div>
      <div class="col-12 col-md-6 col-xxl-3">
        <div class="card border-0 shadow-sm workspace-section-card h-100"><div class="card-body">
          <h6 class="mb-2">Weakest Relationship</h6>
          ${weakest ? `<div class="fw-semibold">${escapeHtml(weakest.first)} vs ${escapeHtml(weakest.second)}</div><div class="text-muted small">Pearson r ${formatAnalysisValue(weakest.value)}</div>` : '<div class="text-muted small">No paired numeric fields available.</div>'}
        </div></div>
      </div>
      <div class="col-12 col-md-6 col-xxl-3">
        <div class="card border-0 shadow-sm workspace-section-card h-100"><div class="card-body">
          <h6 class="mb-2">Positive Correlations</h6>
          ${pairList(positive, 'No strong positive correlations identified.')}
        </div></div>
      </div>
      <div class="col-12 col-md-6 col-xxl-3">
        <div class="card border-0 shadow-sm workspace-section-card h-100"><div class="card-body">
          <h6 class="mb-2">Negative Correlations</h6>
          ${pairList(negative, 'No strong negative correlations identified.')}
        </div></div>
      </div>
    `;
  };

  const renderTrendCard = (fieldName, trendData) => {
    const canvasId = `analysis-trend-${fieldName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    const directionBadge = trendData.direction === 'increasing'
      ? 'text-bg-success-subtle text-success-emphasis'
      : trendData.direction === 'declining'
        ? 'text-bg-danger-subtle text-danger-emphasis'
        : 'text-bg-warning-subtle text-warning-emphasis';

    return `
      <div class="card border-0 shadow-sm workspace-section-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div>
              <h6 class="mb-1">${escapeHtml(fieldName)}</h6>
              <p class="text-muted small mb-0">Line chart with trend line and moving average.</p>
            </div>
            <span class="badge ${directionBadge}">${escapeHtml(trendData.direction || 'insufficient_data')}</span>
          </div>
          <div class="workspace-chart-placeholder mb-3">
            <canvas id="${canvasId}" height="220"></canvas>
          </div>
          <div class="d-flex flex-wrap gap-2 small">
            <span class="badge text-bg-light text-dark">Slope: ${formatAnalysisValue(trendData.slope)}</span>
            <span class="badge text-bg-light text-dark">Outliers: ${Array.isArray(trendData.outliers) ? trendData.outliers.length : 0}</span>
            <span class="badge text-bg-light text-dark">Spikes: ${Array.isArray(trendData.spikes) ? trendData.spikes.length : 0}</span>
          </div>
        </div>
      </div>
    `;
  };

  const renderInsightSummary = (insights) => `
    <div class="col-12">
      <div class="alert alert-info shadow-sm mb-0">
        <div class="fw-semibold mb-2">Insights</div>
        <p class="mb-0">${escapeHtml(insights.join(' '))}</p>
      </div>
    </div>
  `;

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

    if (els.sidebarRows) els.sidebarRows.textContent = String(rows ?? '-');
    if (els.sidebarColumns) els.sidebarColumns.textContent = String(columns ?? '-');
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
    const visibleColumns = state.previewColumns.filter((column) => !isExcludedAnalysisField(column));
    if (!visibleColumns.length) {
      els.columnInfo.innerHTML = '<div class="col-12"><div class="alert alert-light border mb-0">No visible fields available.</div></div>';
      return;
    }

    els.columnInfo.innerHTML = visibleColumns.map((column) => {
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
    const analysis = getAnalysisData();
    const hasDataset = Boolean(state.datasetId);

    if (state.analysisLoading) {
      clearAnalysisMessage();
      hideAnalysisViews();
      if (els.analysisLoading) els.analysisLoading.classList.remove('d-none');
      if (els.analysisEmptyState) els.analysisEmptyState.classList.add('d-none');
      return;
    }

    if (!hasDataset || !analysis || !Object.keys(analysis).length) {
      hideAnalysisViews();
      if (els.analysisLoading) els.analysisLoading.classList.add('d-none');
      if (els.analysisEmptyState) {
        els.analysisEmptyState.textContent = hasDataset
          ? 'No numeric dataset is available for analysis yet.'
          : 'No dataset has been uploaded yet.';
        els.analysisEmptyState.classList.remove('d-none');
      }
      if (els.datasetStatus) els.datasetStatus.textContent = 'Idle';
      return;
    }

    const numericColumns = getNumericColumns();
    if (!numericColumns.length) {
      hideAnalysisViews();
      if (els.analysisLoading) els.analysisLoading.classList.add('d-none');
      if (els.analysisEmptyState) {
        els.analysisEmptyState.textContent = 'No numeric columns were detected in this dataset.';
        els.analysisEmptyState.classList.remove('d-none');
      }
      if (els.datasetStatus) els.datasetStatus.textContent = 'Ready';
      return;
    }

    clearAnalysisMessage();
    if (els.analysisLoading) els.analysisLoading.classList.add('d-none');
    if (els.analysisEmptyState) els.analysisEmptyState.classList.add('d-none');
    if (els.analysisDashboard) els.analysisDashboard.classList.remove('d-none');
    if (els.datasetStatus) els.datasetStatus.textContent = 'Analyzed';

    const descriptiveRows = getDescriptiveStatistics();
    if (els.analysisDescriptiveTable) {
      const tbody = descriptiveRows.length
        ? descriptiveRows.map((row) => `
          <tr>
            <td class="fw-semibold text-nowrap">${escapeHtml(row.field)}</td>
            <td>${formatAnalysisValue(row.mean)}</td>
            <td>${formatAnalysisValue(row.median)}</td>
            <td>${formatAnalysisValue(row.mode)}</td>
            <td>${formatAnalysisValue(row.minimum)}</td>
            <td>${formatAnalysisValue(row.maximum)}</td>
            <td>${formatAnalysisValue(row.std_dev)}</td>
            <td>${formatAnalysisValue(row.variance)}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="8" class="text-center text-muted py-4">No numeric fields were found.</td></tr>';
      const tableBody = els.analysisDescriptiveTable.querySelector('tbody');
      if (tableBody) tableBody.innerHTML = tbody;
    }

    const trendAnalysis = getTrendAnalysis();
    if (els.analysisTrendCards) {
      const trendEntries = Object.entries(trendAnalysis);
      els.analysisTrendCards.innerHTML = trendEntries.length
        ? trendEntries.map(([fieldName, trendData]) => renderTrendCard(fieldName, trendData)).join('')
        : '<div class="alert alert-light border mb-0">No trend data is available for the expected fields.</div>';
    }

    const insightList = getInsights();
    if (els.analysisInsightCards) {
      els.analysisInsightCards.innerHTML = insightList.length
        ? renderInsightSummary(insightList)
        : '<div class="col-12"><div class="alert alert-light border mb-0">No insights were generated for this dataset.</div></div>';
    }

    destroyAnalysisCharts();
    Object.entries(trendAnalysis).forEach(([fieldName, trendData]) => {
      const canvasId = `analysis-trend-${fieldName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
      const canvas = document.getElementById(canvasId);
      if (!canvas || !window.Chart) return;

      const chart = new window.Chart(canvas, {
        type: 'line',
        data: {
          labels: trendData.labels || [],
          datasets: [
            {
              label: fieldName,
              data: trendData.values || [],
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.18)',
              tension: 0.3,
              fill: false,
              pointRadius: 2,
            },
            {
              label: 'Trend line',
              data: trendData.trend_line || [],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderDash: [6, 4],
              tension: 0,
              fill: false,
              pointRadius: 0,
            },
            {
              label: 'Moving average',
              data: trendData.moving_average || [],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              tension: 0.25,
              fill: false,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
          },
          scales: {
            x: { title: { display: true, text: 'Row' } },
            y: { title: { display: true, text: fieldName } },
          },
        },
      });
      state.analysisCharts.push(chart);
    });

    if (els.analysisStateAlert) {
      els.analysisStateAlert.textContent = `Analysis completed for ${numericColumns.length} numeric columns.`;
      els.analysisStateAlert.className = 'alert alert-success mb-4';
      els.analysisStateAlert.classList.remove('d-none');
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

    const numericColumns = state.previewColumns.filter((column) => inferColumnType(column) === 'Numeric' && !isExcludedVisualizationField(column));
    const firstNumeric = numericColumns[0];
    const secondNumeric = numericColumns[1] || numericColumns[0];
    const rows = state.preview;

    const chartDefs = [];
    if (firstNumeric) {
      const values = rows.map((row) => row[firstNumeric]);
      const distribution = makeDistribution(values);
      chartDefs.push({
        title: 'Bar Chart',
        description: `Average-focused distribution for ${firstNumeric}.`,
        canvasId: 'chart-bar',
        type: 'bar',
        data: {
          labels: distribution.labels,
          datasets: [{ label: firstNumeric, data: distribution.counts, backgroundColor: 'rgba(37, 99, 235, 0.7)' }],
        },
      });
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
    updatePredictionSelectors();
    updateHeader();
  };

  function getPredictionConfig() {
    const attendanceColumn = state.previewColumns.find((column) => normalizeFieldName(column) === normalizeFieldName('Attendance')) || 'Attendance';
    const targetColumn = state.previewColumns.find((column) => normalizeFieldName(column) === normalizeFieldName('Final Score')) || 'Final Score';
    return {
      targetColumn,
      featureColumns: [attendanceColumn],
    };
  }

  function updatePredictionSelectors() {
    const config = getPredictionConfig();
    if (els.predictionSummary) {
      els.predictionSummary.textContent = `Predict ${config.targetColumn} from ${config.featureColumns.join(', ')} using Linear Regression.`;
    }
  }

  const loadAnalysis = async () => {
    if (!state.datasetId) return;
    state.analysisLoading = true;
    if (els.datasetStatus) els.datasetStatus.textContent = 'Analyzing…';
    renderAnalysis();
    const response = await fetch(`/Data/api/analysis/analyze.php?dataset_id=${state.datasetId}`, { credentials: 'same-origin' });
    const json = await response.json();
    if (!json.success) {
      state.analysisLoading = false;
      renderAnalysis();
      showAlert(json.message || 'Analysis failed', 'danger');
      return;
    }
    state.analysisLoading = false;
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
    const config = getPredictionConfig();
    if (!config.targetColumn || !config.featureColumns.length) {
      showAlert('Attendance and Final Score columns are required for prediction.', 'warning');
      return;
    }
    if (els.runPredictBtn) els.runPredictBtn.disabled = true;
    try {
      const form = new FormData();
      form.append('dataset_id', String(state.datasetId));
      form.append('target_column', config.targetColumn);
      form.append('model_type', 'linear_regression');
      config.featureColumns.forEach((column) => form.append('feature_columns[]', column));
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
    updatePredictionSelectors();
    workspaceModalInstance?.show();
    if (els.previewArea) els.previewArea.innerHTML = '<div class="p-4 text-muted">Loading preview…</div>';
    loadPreview()
      .then(() => loadAnalysis())
      .catch((error) => showAlert(error.message || 'Failed to load preview', 'danger'));
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
    loadPreview()
      .then(() => loadAnalysis())
      .catch((error) => showAlert(error.message || 'Workspace failed to load', 'danger'));
  }

  window.DatasetWorkspace = {
    open: handleWorkspaceOpen,
    refreshPreview: loadPreview,
    runAnalysis: loadAnalysis,
    runVisualization: runVisualizationApi,
    runPrediction,
  };
});
