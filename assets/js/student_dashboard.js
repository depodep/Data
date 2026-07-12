document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('studentDatasetsGrid');
  const emptyState = document.getElementById('studentEmptyState');
  const alertBox = document.getElementById('studentDashboardAlert');
  const datasetCount = document.getElementById('studentDatasetCount');
  const recordCount = document.getElementById('studentRecordCount');
  const chartInstances = [];

  const destroyCharts = () => {
    chartInstances.forEach((chart) => chart.destroy());
    chartInstances.length = 0;
  };

  const showAlert = (message, type = 'info') => {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} shadow-sm mb-4`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderInsightList = (analysis) => {
    const insights = Array.isArray(analysis?.insights) ? analysis.insights : [];
    if (!insights.length) {
      return '<div class="text-muted small">No dataset insights are available yet.</div>';
    }
    return `<ul class="small mb-0 ps-3">${insights.slice(0, 5).map((insight) => `<li>${escapeHtml(insight)}</li>`).join('')}</ul>`;
  };

  const renderDatasetCard = (item, index) => {
    const record = item.record || {};
    const chartId = `student-chart-${item.dataset_id}`;
    const values = [record.quiz_score, record.midterm_score, record.final_score, record.attendance].map((value) => Number(value));
    const safeValues = values.map((value) => (Number.isFinite(value) ? value : 0));
    return `
      <div class="col-12 col-xl-6">
        <div class="card border-0 shadow-sm h-100 student-dataset-card">
          <div class="card-body p-4">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h2 class="h5 mb-1">${escapeHtml(item.dataset_name || 'Dataset')}</h2>
                <p class="text-muted small mb-0">${escapeHtml(item.dataset_description || 'No description provided.')}</p>
              </div>
              <span class="badge text-bg-light text-dark">${escapeHtml(item.processing_status || 'ready')}</span>
            </div>

            <div class="row g-2 mb-3 small">
              <div class="col-6"><div class="workspace-mini-kpi p-3 h-100"><div class="text-muted small">Student ID / Name</div><div class="fw-semibold">${escapeHtml(record.student_id || '-')} <span class="text-muted fw-normal">|</span> ${escapeHtml(record.student_name || '-')}</div></div></div>
              <div class="col-6"><div class="workspace-mini-kpi p-3 h-100"><div class="text-muted small">Subject</div><div class="fw-semibold">${escapeHtml(record.subject || '-')}</div></div></div>
              <div class="col-6"><div class="workspace-mini-kpi p-3 h-100"><div class="text-muted small">Course</div><div class="fw-semibold">${escapeHtml(record.course || '-')}</div></div></div>
              <div class="col-6"><div class="workspace-mini-kpi p-3 h-100"><div class="text-muted small">Section</div><div class="fw-semibold">${escapeHtml(record.section || '-')}</div></div></div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Quiz</div><div class="h5 mb-0">${escapeHtml(record.quiz_score ?? '-')}</div></div></div>
              <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Midterm</div><div class="h5 mb-0">${escapeHtml(record.midterm_score ?? '-')}</div></div></div>
              <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Final</div><div class="h5 mb-0">${escapeHtml(record.final_score ?? '-')}</div></div></div>
              <div class="col-6 col-lg-3"><div class="workspace-mini-kpi p-3"><div class="text-muted small">Attendance</div><div class="h5 mb-0">${escapeHtml(record.attendance ?? '-')}</div></div></div>
            </div>

            <div class="workspace-chart-placeholder mb-3">
              <canvas id="${chartId}" height="220"></canvas>
            </div>

            <div class="mb-3">
              <h3 class="h6 mb-2">Insights</h3>
              ${renderInsightList(item.analysis)}
            </div>

            <div class="text-muted small">Uploaded: ${escapeHtml(formatDate(item.uploaded_at))}</div>
          </div>
        </div>
      </div>
    `;
  };

  const renderCharts = (datasets) => {
    if (!window.Chart) return;
    destroyCharts();

    datasets.forEach((item) => {
      const record = item.record || {};
      const canvas = document.getElementById(`student-chart-${item.dataset_id}`);
      if (!canvas) return;

      const chart = new window.Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Quiz', 'Midterm', 'Final', 'Attendance'],
          datasets: [{
            label: item.dataset_name || 'Dataset',
            data: [record.quiz_score, record.midterm_score, record.final_score, record.attendance].map((value) => Number(value) || 0),
            backgroundColor: ['rgba(37, 99, 235, 0.75)', 'rgba(14, 165, 233, 0.75)', 'rgba(16, 185, 129, 0.75)', 'rgba(245, 158, 11, 0.75)'],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      });

      chartInstances.push(chart);
    });
  };

  const loadDashboard = async () => {
    if (!grid) return;
    grid.innerHTML = '<div class="col-12"><div class="card border-0 shadow-sm"><div class="card-body p-4 text-center text-muted">Loading your datasets...</div></div></div>';

    try {
      const response = await fetch('/Data/api/students/overview.php', { credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        showAlert(json.message || 'Unable to load student dashboard.', 'danger');
        grid.innerHTML = '';
        return;
      }

      const datasets = Array.isArray(json.datasets) ? json.datasets : [];
      if (datasetCount) datasetCount.textContent = String(datasets.length);
      if (recordCount) recordCount.textContent = String(datasets.length);

      if (!datasets.length) {
        if (emptyState) emptyState.classList.remove('d-none');
        grid.innerHTML = '';
        return;
      }

      if (emptyState) emptyState.classList.add('d-none');
      grid.innerHTML = datasets.map((item, index) => renderDatasetCard(item, index)).join('');
      renderCharts(datasets);
    } catch (error) {
      showAlert('Failed to load your student dashboard.', 'danger');
      grid.innerHTML = '';
    }
  };

  loadDashboard();
});
