document.addEventListener('DOMContentLoaded', () => {
  const datasetId = window.__DATASET_ID || 0;
  const previewArea = document.getElementById('previewArea');
  const alertEl = document.getElementById('workspaceAlert');

  function showAlert(message, type = 'info') {
    if (!alertEl) return;
    alertEl.className = `alert alert-${type}`;
    alertEl.textContent = message;
    alertEl.classList.remove('d-none');
    setTimeout(() => alertEl.classList.add('d-none'), 8000);
  }

  async function loadPreview(limit = 10) {
    previewArea.innerHTML = 'Loading preview…';
    try {
      const res = await fetch(`/Data/api/datasets/preview.php?dataset_id=${datasetId}&limit=${limit}`, { credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) {
        previewArea.innerHTML = `<div class="text-danger">${json.message || 'Failed to load preview'}</div>`;
        return;
      }

      const cols = json.columns || [];
      const rows = json.rows || [];

      const table = document.createElement('table');
      table.className = 'table table-sm table-striped';
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      cols.forEach(c => { const th = document.createElement('th'); th.textContent = c; headRow.appendChild(th); });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      rows.forEach(r => {
        const tr = document.createElement('tr');
        cols.forEach(c => {
          const td = document.createElement('td');
          td.textContent = (r[c] ?? r[c.toLowerCase()] ?? '');
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      previewArea.innerHTML = '';
      previewArea.appendChild(table);
    } catch (err) {
      previewArea.innerHTML = `<div class="text-danger">Error: ${err.message}</div>`;
    }
  }

  // Import button
  const importBtn = document.getElementById('importBtn');
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      if (!confirm('Import dataset records into the system? This action will parse the CSV and insert records.')) return;
      importBtn.disabled = true;
      importBtn.textContent = 'Importing…';
      try {
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const form = new FormData();
        form.append('dataset_id', datasetId);
        form.append('csrf_token', token);

        const res = await fetch('/Data/api/datasets/import.php', { method: 'POST', body: form, credentials: 'same-origin' });
        const json = await res.json();
        if (!json.success) {
          showAlert(json.message || 'Import failed', 'danger');
        } else {
          showAlert(`Imported ${json.inserted} rows. ${json.errors?.length ? json.errors.length + ' errors.' : ''}`, 'success');
          // reload preview (now from DB)
          await loadPreview(10);
        }
      } catch (err) {
        showAlert('Import error: ' + err.message, 'danger');
      } finally {
        importBtn.disabled = false;
        importBtn.textContent = 'Import Records';
      }
    });
  }

  // initial load
  if (datasetId) loadPreview(10);

  // Cleaning
  const runCleanBtn = document.getElementById('runCleanBtn');
  const cleanOutput = document.getElementById('cleanOutput');
  const previewCleanBtn = document.getElementById('previewCleanBtn');
  const missingStrategyEl = document.getElementById('missingStrategy');
  const optRemoveDuplicates = document.getElementById('optRemoveDuplicates');
    if (runCleanBtn) {
    runCleanBtn.addEventListener('click', async () => {
      if (!confirm('Run cleaning script on this dataset?')) return;
      runCleanBtn.disabled = true;
      runCleanBtn.textContent = 'Cleaning…';
      try {
        const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const form = new FormData();
        form.append('dataset_id', datasetId);
        form.append('csrf_token', token);
        form.append('remove_duplicates', optRemoveDuplicates && optRemoveDuplicates.checked ? '1' : '0');
        form.append('missing_strategy', missingStrategyEl ? missingStrategyEl.value : 'none');
        const res = await fetch('/Data/api/cleaning/clean.php', { method: 'POST', body: form, credentials: 'same-origin' });
        const json = await res.json();
        if (!json.success) {
          showAlert(json.message || 'Cleaning failed', 'danger');
          cleanOutput.textContent = JSON.stringify(json, null, 2);
        } else {
          showAlert('Cleaning completed', 'success');
          cleanOutput.textContent = JSON.stringify(json.summary, null, 2);
          // update preview from cleaned file
          await loadPreview(10);
        }
      } catch (err) {
        showAlert('Cleaning error: ' + err.message, 'danger');
      } finally {
        runCleanBtn.disabled = false;
        runCleanBtn.textContent = 'Run Cleaning';
      }
    });
  }

  // Preview cleaned CSV
  if (previewCleanBtn) {
    previewCleanBtn.addEventListener('click', async () => {
      previewCleanBtn.disabled = true;
      previewCleanBtn.textContent = 'Previewing…';
      try {
        const removeDup = optRemoveDuplicates && optRemoveDuplicates.checked ? 1 : 0;
        const missing = missingStrategyEl ? missingStrategyEl.value : 'none';
        const res = await fetch(`/Data/api/cleaning/preview.php?dataset_id=${datasetId}&remove_duplicates=${removeDup}&missing_strategy=${encodeURIComponent(missing)}`, { credentials: 'same-origin' });
        const json = await res.json();
        if (!json.success) {
          showAlert(json.message || 'Preview failed', 'danger');
          cleanOutput.textContent = JSON.stringify(json, null, 2);
        } else {
          showAlert('Preview generated', 'info');
          cleanOutput.textContent = JSON.stringify(json.summary, null, 2);
          // show first rows below
          const rows = json.rows || [];
          const cols = rows.length ? Object.keys(rows[0]) : [];
          const table = document.createElement('table');
          table.className = 'table table-sm';
          const thead = document.createElement('thead');
          const headRow = document.createElement('tr');
          cols.forEach(c => { const th = document.createElement('th'); th.textContent = c; headRow.appendChild(th); });
          thead.appendChild(headRow);
          table.appendChild(thead);
          const tbody = document.createElement('tbody');
          rows.forEach(r => {
            const tr = document.createElement('tr');
            cols.forEach(c => { const td = document.createElement('td'); td.textContent = r[c] ?? ''; tr.appendChild(td); });
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          // replace previewArea
          const previewArea = document.getElementById('previewArea');
          if (previewArea) {
            previewArea.innerHTML = '';
            previewArea.appendChild(table);
          }
        }
      } catch (err) {
        showAlert('Preview error: ' + err.message, 'danger');
      } finally {
        previewCleanBtn.disabled = false;
        previewCleanBtn.textContent = 'Preview Cleaned';
      }
    });
  }

  // Analysis
  const runAnalyzeBtn = document.getElementById('runAnalyzeBtn');
  const analysisOutput = document.getElementById('analysisOutput');
  if (runAnalyzeBtn) {
    runAnalyzeBtn.addEventListener('click', async () => {
      runAnalyzeBtn.disabled = true;
      runAnalyzeBtn.textContent = 'Analyzing…';
      try {
        const res = await fetch(`/Data/api/analysis/analyze.php?dataset_id=${datasetId}`, { credentials: 'same-origin' });
        const json = await res.json();
        if (!json.success) {
          showAlert(json.message || 'Analysis failed', 'danger');
          analysisOutput.textContent = JSON.stringify(json, null, 2);
        } else {
          showAlert('Analysis completed', 'success');
          analysisOutput.textContent = JSON.stringify(json.analysis, null, 2);
        }
      } catch (err) {
        showAlert('Analysis error: ' + err.message, 'danger');
      } finally {
        runAnalyzeBtn.disabled = false;
        runAnalyzeBtn.textContent = 'Run Analysis';
      }
    });
  }

  // Visualization
  const runVisualBtn = document.getElementById('runVisualBtn');
  const visualOutput = document.getElementById('visualOutput');
  if (runVisualBtn) {
    runVisualBtn.addEventListener('click', async () => {
      runVisualBtn.disabled = true;
      runVisualBtn.textContent = 'Generating…';
      try {
        const res = await fetch(`/Data/api/visualization/visualize.php?dataset_id=${datasetId}`, { credentials: 'same-origin' });
        const json = await res.json();
        if (!json.success) {
          showAlert(json.message || 'Visualization failed', 'danger');
        } else {
          showAlert('Visualization completed', 'success');
          visualOutput.innerHTML = '';
          (json.charts || []).forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.alt = 'chart';
            img.className = 'img-thumbnail';
            img.style.maxWidth = '320px';
            visualOutput.appendChild(img);
          });
        }
      } catch (err) {
        showAlert('Visualization error: ' + err.message, 'danger');
      } finally {
        runVisualBtn.disabled = false;
        runVisualBtn.textContent = 'Generate Charts';
      }
    });
  }

  // Prediction
  const runPredictBtn = document.getElementById('runPredictBtn');
  const predictTarget = document.getElementById('predictTarget');
  const predictOutput = document.getElementById('predictOutput');
  if (runPredictBtn) {
    runPredictBtn.addEventListener('click', async () => {
      const target = (predictTarget && predictTarget.value) ? predictTarget.value.trim() : '';
      if (!target) { showAlert('Please provide a target column name', 'warning'); return; }
      if (!confirm('Run prediction using target: ' + target + '?')) return;
      runPredictBtn.disabled = true;
      runPredictBtn.textContent = 'Predicting…';
      try {
        const form = new FormData();
        form.append('dataset_id', datasetId);
        form.append('target_column', target);
        const res = await fetch('/Data/api/prediction/predict.php', { method: 'POST', body: form, credentials: 'same-origin' });
        const json = await res.json();
        if (!json.success) {
          showAlert(json.message || 'Prediction failed', 'danger');
          predictOutput.textContent = JSON.stringify(json, null, 2);
        } else {
          showAlert('Prediction completed', 'success');
          predictOutput.textContent = JSON.stringify(json.result, null, 2);
        }
      } catch (err) {
        showAlert('Prediction error: ' + err.message, 'danger');
      } finally {
        runPredictBtn.disabled = false;
        runPredictBtn.textContent = 'Run Prediction';
      }
    });
  }
});
