document.addEventListener('DOMContentLoaded', () => {
  const els = {
    openUpload: document.getElementById('openUpload'),
    uploadModal: document.getElementById('uploadModal'),
    uploadForm: document.getElementById('uploadForm'),
    uploadDatasetFile: document.getElementById('uploadDatasetFile'),
    uploadDatasetName: document.getElementById('uploadDatasetName'),
    uploadSharedScope: document.getElementById('uploadSharedScope'),
    uploadDescription: document.getElementById('uploadDescription'),
    uploadPreviewBtn: document.getElementById('uploadPreviewBtn'),
    uploadCleanPreviewBtn: document.getElementById('uploadCleanPreviewBtn'),
    uploadPreviewArea: document.getElementById('uploadPreviewArea'),
    uploadPreviewControls: document.getElementById('uploadPreviewControls'),
    uploadMissingStrategy: document.getElementById('uploadMissingStrategy'),
    uploadRemoveDuplicates: document.getElementById('uploadRemoveDuplicates'),
    uploadStored: document.getElementById('uploadStored'),
    uploadSaveBtn: document.getElementById('uploadSaveBtn'),
    uploadAlert: document.getElementById('uploadAlert'),
  };

  if (!els.uploadModal) return;

  const bootstrapModal = window.bootstrap?.Modal;
  const modalInstance = bootstrapModal ? bootstrapModal.getOrCreateInstance(els.uploadModal) : null;

  const showAlert = (message, type = 'info') => {
    if (!els.uploadAlert) return;
    els.uploadAlert.className = `alert alert-${type} mb-3`;
    els.uploadAlert.textContent = message;
    els.uploadAlert.classList.remove('d-none');
  };

  const clearAlert = () => {
    if (!els.uploadAlert) return;
    els.uploadAlert.classList.add('d-none');
    els.uploadAlert.textContent = '';
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const buildPreviewTable = (rows) => {
    if (!Array.isArray(rows) || !rows.length) {
      return '<div class="p-3 text-muted">No preview rows available.</div>';
    }
    const columns = Object.keys(rows[0]);
    const duplicateMap = new Map();
    rows.forEach((row) => {
      const key = columns.map((column) => String(row[column] ?? '')).join('||');
      duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
    });

    const missingCounts = columns.reduce((acc, column) => {
      acc[column] = rows.reduce((count, row) => count + ((row[column] === null || row[column] === undefined || row[column] === '') ? 1 : 0), 0);
      return acc;
    }, {});

    const duplicates = Array.from(duplicateMap.values()).filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
    const summaryRows = rows.length;
    const summaryMissing = Object.values(missingCounts).reduce((sum, value) => sum + value, 0);

    const headerHtml = columns.map((column) => `<th class="align-middle text-nowrap">${escapeHtml(column)}</th>`).join('');

    const bodyHtml = rows.map((row) => {
      const key = columns.map((column) => String(row[column] ?? '')).join('||');
      const isDuplicate = duplicateMap.get(key) > 1;
      return `<tr class="${isDuplicate ? 'table-danger' : ''}">` + columns.map((column) => {
        const value = row[column] ?? '';
        const isMissing = value === '';
        const cellClass = isMissing ? 'text-danger' : '';
        return `<td class="${cellClass}">${escapeHtml(value)}</td>`;
      }).join('') + '</tr>';
    }).join('');

    return `
      <div class="mb-3 small text-muted">
        <span class="me-3"><strong>${summaryRows}</strong> rows</span>
        <span class="me-3"><strong>${summaryMissing}</strong> missing values</span>
        <span class="me-3"><strong>${duplicates}</strong> duplicate cells</span>
      </div>
      <div class="table-responsive" style="max-height:360px; overflow:auto;">
        <table class="table table-sm table-hover table-bordered align-middle mb-0">
          <thead class="table-light position-sticky top-0">
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
      <div class="mt-2 small text-muted">Rows with duplicate values are shaded. Empty values are highlighted in red.</div>
    `;
  };

  const renderPreview = (rows, previewType, extra = {}) => {
    if (!els.uploadPreviewArea) return;
    const header = previewType === 'clean' ? 'Clean Preview' : 'Upload Preview';
    const note = previewType === 'clean'
      ? 'Showing the cleaned dataset preview after applying duplicate removal and missing value fill rules.'
      : 'Showing the first rows from the uploaded file before saving.';
    els.uploadPreviewArea.innerHTML = `
      <div class="mb-3">
        <h6 class="mb-1">${escapeHtml(header)}</h6>
        <p class="text-muted small mb-2">${escapeHtml(note)}</p>
        ${extra.summary ? `<div class="alert alert-secondary py-2 mb-3 small">${escapeHtml(extra.summary)}</div>` : ''}
      </div>
      ${buildPreviewTable(rows)}
    `;
    els.uploadPreviewControls?.classList.remove('d-none');
  };

  const serializeUploadForm = (form, mode) => {
    const formData = new FormData();
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    if (token) formData.append('csrf_token', token);
    formData.append('mode', mode);
    formData.append('remove_duplicates', els.uploadRemoveDuplicates?.checked ? '1' : '0');
    formData.append('missing_strategy', els.uploadMissingStrategy?.value || 'none');
    if (els.uploadDatasetFile?.files?.length) {
      formData.append('dataset', els.uploadDatasetFile.files[0]);
    }
    if (els.uploadStored?.value) {
      formData.append('stored', els.uploadStored.value);
    }
    return formData;
  };

  const requestPreview = async (mode) => {
    clearAlert();
    const hasFile = els.uploadDatasetFile?.files?.length;
    const hasStored = Boolean(els.uploadStored?.value);
    if (!hasFile && !hasStored) {
      showAlert('Select a CSV file before previewing.', 'warning');
      return;
    }

    els.uploadPreviewBtn?.setAttribute('disabled', 'disabled');
    els.uploadCleanPreviewBtn?.setAttribute('disabled', 'disabled');

    try {
      const formData = serializeUploadForm(els.uploadForm, mode);
      const response = await fetch('/Data/api/datasets/upload.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });
      const json = await response.json();
      if (!json.success) {
        showAlert(json.message || 'Preview failed.', 'danger');
        return;
      }
      if (json.stored) {
        els.uploadStored.value = json.stored;
      }
      const rows = json.preview || json.rows || [];
      if (mode === 'clean' && json.cleaned) {
        els.uploadSaveBtn.textContent = 'Save Cleaned Dataset';
        els.uploadPreviewArea.classList.add('border-success');
      } else {
        els.uploadSaveBtn.textContent = 'Save to Workspace';
        els.uploadPreviewArea.classList.remove('border-success');
      }
      renderPreview(rows, mode, {
        summary: mode === 'clean' ? `Cleaned preview generated using ${els.uploadRemoveDuplicates?.checked ? 'duplicate removal' : 'duplicate retention'} and ${els.uploadMissingStrategy?.value === 'none' ? 'no missing fill' : els.uploadMissingStrategy?.selectedOptions[0]?.text || 'missing value fill'}.` : '',
      });
    } catch (error) {
      showAlert(error.message || 'Unable to preview upload.', 'danger');
    } finally {
      els.uploadPreviewBtn?.removeAttribute('disabled');
      els.uploadCleanPreviewBtn?.removeAttribute('disabled');
    }
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    clearAlert();

    const hasFile = els.uploadDatasetFile?.files?.length;
    const hasStored = Boolean(els.uploadStored?.value);
    if (!hasFile && !hasStored) {
      showAlert('Select a CSV file before saving.', 'warning');
      return;
    }

    els.uploadSaveBtn?.setAttribute('disabled', 'disabled');

    try {
      const formData = new FormData(els.uploadForm);
      if (!formData.has('csrf_token')) {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        if (token) formData.append('csrf_token', token);
      }
      if (els.uploadDatasetFile?.files?.length) {
        formData.set('dataset', els.uploadDatasetFile.files[0]);
      }
      if (els.uploadStored?.value) {
        formData.set('stored', els.uploadStored.value);
      }

      const response = await fetch('/Data/api/datasets/upload.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });
      const json = await response.json();
      if (!json.success) {
        showAlert(json.message || 'Upload failed.', 'danger');
        return;
      }
      showAlert(json.message || 'Dataset saved to workspace.', 'success');
      if (modalInstance) {
        setTimeout(() => modalInstance.hide(), 800);
      }
      setTimeout(() => {
        if (typeof window.location !== 'undefined') {
          window.location.reload();
        }
      }, 800);
    } catch (error) {
      showAlert(error.message || 'Unable to save dataset.', 'danger');
    } finally {
      els.uploadSaveBtn?.removeAttribute('disabled');
    }
  };

  if (els.openUpload && modalInstance) {
    els.openUpload.addEventListener('click', () => {
      clearAlert();
      els.uploadForm?.reset();
      if (els.uploadStored) els.uploadStored.value = '';
      els.uploadPreviewControls?.classList.add('d-none');
      els.uploadPreviewArea.innerHTML = 'Select a CSV file and click Preview Data to inspect rows and cleaning effects.';
      els.uploadSaveBtn.textContent = 'Save to Workspace';
      modalInstance.show();
    });
  }

  els.uploadPreviewBtn?.addEventListener('click', () => requestPreview('preview'));
  els.uploadCleanPreviewBtn?.addEventListener('click', () => requestPreview('clean'));
  els.uploadForm?.addEventListener('submit', submitUpload);
});