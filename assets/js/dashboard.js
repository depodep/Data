document.addEventListener('DOMContentLoaded', () => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const cardDatasets = document.getElementById('cardDatasets');
  const cardRecords = document.getElementById('cardRecords');
  const cardUsers = document.getElementById('cardUsers');
  const recentDatasets = document.getElementById('recentDatasets');
  const recentActivities = document.getElementById('recentActivities');

  const render = async () => {
    const res = await fetch('/Data/api/dashboard.php', { headers: { 'X-CSRF-Token': csrf } });
    const json = await res.json();

    if (!json.success) return;

    const data = json.data;
    cardDatasets.textContent = data.stats.total_datasets ?? '—';
    cardRecords.textContent = data.stats.total_records ?? '—';
    cardUsers.textContent = data.stats.total_users ?? '—';

    recentDatasets.innerHTML = data.recent_datasets.map(ds => `
      <div class="mb-2">
        <strong>${escapeHtml(ds.dataset_name)}</strong>
        <div class="small text-muted">by ${escapeHtml(ds.owner_name ?? 'Unknown')} • ${ds.record_count} rows</div>
      </div>
    `).join('');

    recentActivities.innerHTML = data.recent_activities.map(a => `
      <div class="mb-2">
        <div><strong>${escapeHtml(a.user_name ?? 'System')}</strong> <span class="text-muted">${escapeHtml(a.activity_type)}</span></div>
        <div class="small text-muted">${escapeHtml(a.module_name)} • ${escapeHtml(a.description)}</div>
      </div>
    `).join('');
  };

  const escapeHtml = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

  render();
});
document.addEventListener('DOMContentLoaded', () => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const statDatasetCount = document.getElementById('statDatasetCount');
  const statRecordCount = document.getElementById('statRecordCount');
  const statActivityCount = document.getElementById('statActivityCount');
  const recentDatasetsBody = document.getElementById('recentDatasetsBody');
  const recentActivitiesList = document.getElementById('recentActivitiesList');

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const badgeForStatus = (status) => {
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

  const loadDashboard = async () => {
    const response = await fetch('/Data/api/dashboard/summary.php', {
      headers: { 'X-CSRF-Token': csrfToken },
    });
    const result = await response.json();

    if (!result.success) return;

    const data = result.data;
    statDatasetCount.textContent = data.stats.dataset_count;
    statRecordCount.textContent = data.stats.record_count;
    statActivityCount.textContent = data.stats.activity_count;

    recentDatasetsBody.innerHTML = data.recent_datasets.length === 0
      ? '<tr><td colspan="5" class="text-muted py-4 text-center">No datasets yet.</td></tr>'
      : data.recent_datasets.map((dataset) => `
        <tr>
          <td>
            <div class="fw-semibold">${escapeHtml(dataset.dataset_name)}</div>
            <div class="text-muted small">${escapeHtml(dataset.file_type)}</div>
          </td>
          <td>${escapeHtml(dataset.owner_name)}</td>
          <td><span class="badge text-bg-${badgeForStatus(dataset.processing_status)}">${escapeHtml(dataset.processing_status)}</span></td>
          <td>${escapeHtml(dataset.record_count)}</td>
        </tr>
      `).join('');

    recentActivitiesList.innerHTML = data.recent_activities.length === 0
      ? '<div class="text-muted py-4 text-center">No activity yet.</div>'
      : data.recent_activities.map((activity) => `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div>
            <div class="fw-semibold">${escapeHtml(activity.description)}</div>
            <div class="text-muted small">${escapeHtml(activity.actor_name || 'System')} · ${escapeHtml(activity.module_name)} · ${escapeHtml(activity.created_at)}</div>
          </div>
        </div>
      `).join('');
  };

  loadDashboard();
});
