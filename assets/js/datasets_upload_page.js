document.addEventListener('DOMContentLoaded', () => {
  const els = {
    uploadForm: document.getElementById('uploadPageForm'),
    uploadDatasetFile: document.getElementById('uploadDatasetFile'),
    uploadDatasetName: document.getElementById('uploadDatasetName'),
    uploadDescription: document.getElementById('uploadDescription'),
    startValidationBtn: document.getElementById('startValidationBtn'),
    uploadStored: document.getElementById('uploadStored'),
    validationSummaryCard: document.getElementById('validationSummaryCard'),
    validationSummaryCards: document.getElementById('validationSummaryCards'),
    validationReportCard: document.getElementById('validationReportCard'),
    validationStatusBadge: document.getElementById('validationStatusBadge'),
    validationChecks: document.getElementById('validationChecks'),
    validationErrorsCard: document.getElementById('validationErrorsCard'),
    errorsCountBadge: document.getElementById('errorsCountBadge'),
    validationErrorsTable: document.getElementById('validationErrorsTable'),
    rawPreviewCard: document.getElementById('rawPreviewCard'),
    rawPreviewArea: document.getElementById('rawPreviewArea'),
    preparationCard: document.getElementById('preparationCard'),
    preparationControls: document.getElementById('preparationControls'),
    previewPreparationBtn: document.getElementById('previewPreparationBtn'),
    resetPreparationBtn: document.getElementById('resetPreparationBtn'),
    applyPreparationBtn: document.getElementById('applyPreparationBtn'),
    recommendationsList: document.getElementById('recommendationsList'),
    datasetPreviewArea: document.getElementById('datasetPreviewArea'),
    datasetValidationSummary: document.getElementById('datasetValidationSummary'),
    finalOutputCard: document.getElementById('finalOutputCard'),
    finalOutputArea: document.getElementById('finalOutputArea'),
    saveDatasetBtn: document.getElementById('saveDatasetBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    resetBtn: document.getElementById('resetBtn'),
    saveAndContinueBtn: document.getElementById('saveAndContinueBtn'),
  };

  const requiredFields = ['Student ID', 'Student Name', 'Course', 'Year Level', 'Section', 'Subject'];
  const numericFields = ['Quiz Score', 'Midterm Score', 'Final Score', 'Attendance'];
  const editableColumns = [...requiredFields, ...numericFields];

  const state = {
    rawRows: [],
    originalRows: [],       // snapshot of rows after validation (before any preparation)
    previewRows: [],
    removedColumns: [],      // columns removed from preparation preview
    storedToken: '',
    validated: false,
    scan: null,
    validation: {
      totalErrors: 0,
      duplicateRows: 0,
      rowDetails: [],
    },
    preparationOptions: {
      remove_duplicates: true,
      selected_columns: [...numericFields],
      missing_strategy: 'fill_mean',
      custom_value: '',
    },
    // Per-column strategy store: { columnName: { strategy, custom_value } }
    columnStrategies: {},
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const showAlert = (message, type = 'info') => {
    let alert = document.getElementById('uploadAlert');
    if (!alert) return;
    alert.className = `alert alert-${type} mb-4`;
    alert.textContent = message;
    alert.classList.remove('d-none');
  };

  const clearAlert = () => {
    let alert = document.getElementById('uploadAlert');
    if (!alert) return;
    alert.className = 'alert d-none';
    alert.textContent = '';
  };

  const buildTable = (rows, options = {}) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '<div class="p-3 text-muted">No rows available.</div>';
    }
    const { showDuplicate = true, excludeColumns = [] } = options;
    const hasDuplicate = showDuplicate && rows.some((row) => row.__duplicate);
    const allColumns = Object.keys(rows[0]).filter((col) => col !== '__modified' && col !== '__errors' && col !== '__duplicate' && col !== '__invalid');
    const columns = allColumns.filter((col) => !excludeColumns.includes(col));
    const displayColumns = [...columns, ...(hasDuplicate ? ['Duplicate'] : [])];
    const headerHtml = displayColumns.map((col) => `<th class="align-middle text-nowrap">${escapeHtml(col)}</th>`).join('');
    const bodyHtml = rows.map((row, index) => {
      const rowHasErrors = Array.isArray(row.__errors) && row.__errors.length > 0;
      const rowClass = rowHasErrors ? 'table-danger' : row.__modified ? 'table-success' : '';
      const rowHtml = displayColumns.map((col) => {
        if (col === 'Duplicate') {
          return `<td>${row.__duplicate ? 'Duplicate' : ''}</td>`;
        }
        return `<td>${escapeHtml(row[col] ?? '')}</td>`;
      }).join('');
      return `
        <tr data-row="${index + 2}" class="${rowClass}">
          ${rowHtml}
        </tr>
      `;
    }).join('');
    return `
      <div class="table-responsive" style="max-height:520px; overflow:auto;">
        <table class="table table-sm table-striped table-bordered mb-0">
          <thead class="table-light position-sticky top-0"><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
    `;
  };

  const renderValidationSummary = (scan) => {
    if (!els.validationSummaryCards) return;
    els.validationSummaryCards.innerHTML = `
      <div class="col-6 col-md-4">
        <div class="card border-0 bg-light p-3">
          <div class="text-muted small">Rows</div>
          <div class="h4 mb-0">${scan.total_rows}</div>
        </div>
      </div>
      <div class="col-6 col-md-4">
        <div class="card border-0 bg-light p-3">
          <div class="text-muted small">Columns</div>
          <div class="h4 mb-0">${scan.column_count}</div>
        </div>
      </div>
      <div class="col-6 col-md-4">
        <div class="card border-0 bg-light p-3">
          <div class="text-muted small">Missing values</div>
          <div class="h4 mb-0">${Object.values(scan.missing_counts).reduce((sum, value) => sum + Number(value), 0)}</div>
        </div>
      </div>
      <div class="col-6 col-md-4">
        <div class="card border-0 bg-light p-3">
          <div class="text-muted small">Duplicate rows</div>
          <div class="h4 mb-0">${scan.duplicate_count}</div>
        </div>
      </div>
      <div class="col-6 col-md-4">
        <div class="card border-0 bg-light p-3">
          <div class="text-muted small">Numeric issues</div>
          <div class="h4 mb-0">${scan.invalid_numeric_count}</div>
        </div>
      </div>
      <div class="col-6 col-md-4">
        <div class="card border-0 bg-light p-3">
          <div class="text-muted small">Detected issues</div>
          <div class="h4 mb-0">${scan.issue_count}</div>
        </div>
      </div>
    `;
  };

  const renderValidationReport = (scan) => {
    if (!els.validationChecks || !els.validationStatusBadge) return;
    const issueSeverity = scan.issue_count > 0 ? 'Issues found' : 'No issues detected';
    els.validationStatusBadge.textContent = issueSeverity;
    els.validationStatusBadge.className = `badge ${scan.issue_count > 0 ? 'bg-warning text-dark' : 'bg-success'}`;

    const checks = [
      { title: 'Template structure matches', status: 'success', detail: 'Required headers are present.' },
      { title: 'Dataset is readable', status: 'success', detail: `${scan.total_rows} rows loaded successfully.` },
      { title: 'Duplicate rows flagged', status: scan.duplicate_count > 0 ? 'warning' : 'success', detail: scan.duplicate_count > 0 ? `${scan.duplicate_count} duplicates found.` : 'No duplicates found.' },
      { title: 'Missing values scan', status: Object.values(scan.missing_counts).some((count) => Number(count) > 0) ? 'warning' : 'success', detail: Object.values(scan.missing_counts).some((count) => Number(count) > 0) ? 'Missing values exist.' : 'No missing values found.' },
      { title: 'Numeric column validation', status: scan.invalid_numeric_count > 0 ? 'danger' : 'success', detail: scan.invalid_numeric_count > 0 ? `${scan.invalid_numeric_count} invalid entries in numeric columns.` : 'Numeric values look clean.' },
    ];

    els.validationChecks.innerHTML = checks.map((check) => `
      <div class="list-group-item d-flex justify-content-between align-items-start py-3">
        <div>
          <div class="fw-semibold">${escapeHtml(check.title)}</div>
          <div class="small text-muted">${escapeHtml(check.detail)}</div>
        </div>
        <span class="badge ${check.status === 'success' ? 'bg-success' : check.status === 'warning' ? 'bg-warning text-dark' : 'bg-danger'} align-self-start">${check.status}</span>
      </div>
    `).join('');
  };

  const renderErrorTable = (scan) => {
    if (!els.validationErrorsTable || !els.errorsCountBadge) return;
    els.errorsCountBadge.textContent = `${scan.issue_count} issue${scan.issue_count === 1 ? '' : 's'}`;
    if (scan.issue_count === 0) {
      els.validationErrorsTable.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-4">No validation issues detected.</td></tr>`;
      return;
    }

    els.validationErrorsTable.innerHTML = scan.issues.map((issue, index) => `
      <tr class="issue-row" data-row="${issue.row}">
        <td class="text-nowrap">${issue.row}</td>
        <td class="text-nowrap">${escapeHtml(issue.column)}</td>
        <td>${escapeHtml(issue.problem)}</td>
        <td>${escapeHtml(issue.value)}</td>
        <td>${escapeHtml(issue.recommendation)}</td>
        <td><span class="badge ${issue.status === 'danger' ? 'bg-danger' : issue.status === 'warning' ? 'bg-warning text-dark' : 'bg-success'}">${escapeHtml(issue.status)}</span></td>
      </tr>
    `).join('');

    Array.from(els.validationErrorsTable.querySelectorAll('.issue-row')).forEach((row) => {
      row.addEventListener('click', () => {
        const rowIndex = Number(row.getAttribute('data-row')) - 2;
        if (!Number.isFinite(rowIndex) || rowIndex < 0) return;
        highlightRawPreviewRow(rowIndex);
      });
    });
  };

  const renderPreparationOptions = () => {
    if (!els.preparationControls) return;

    // Build summary of applied strategies
    const appliedEntries = Object.entries(state.columnStrategies);
    const appliedSummaryHtml = appliedEntries.length > 0 ? `
      <div class="col-12">
        <div class="alert alert-info py-2 px-3 mb-0">
          <div class="fw-semibold small mb-1"><i class="bi bi-check-circle"></i> Applied strategies:</div>
          <div class="d-flex flex-wrap gap-2">
            ${appliedEntries.map(([col, cfg]) => {
              const label = cfg.strategy.replace('fill_', 'Fill ').replace('leave_blank', 'Leave Blank').replace('_', ' ');
              const customNote = cfg.strategy === 'fill_custom' ? ` (${escapeHtml(cfg.custom_value)})` : '';
              return `<span class="badge bg-primary-subtle text-primary-emphasis">${escapeHtml(col)}: ${label}${customNote}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    ` : '';

    els.preparationControls.innerHTML = `
      <div class="col-12">
        <label class="form-label small">Select columns</label>
        <div class="d-flex flex-wrap gap-2" id="prepColumnSelection"></div>
      </div>
      <div class="col-12 col-md-6">
        <label class="form-label small">Missing value strategy</label>
        <select id="prepMissingStrategy" class="form-select form-select-sm">
          <option value="fill_mean">Fill with Mean</option>
          <option value="fill_median">Fill with Median</option>
          <option value="fill_mode">Fill with Mode</option>
          <option value="fill_zero">Fill with Zero</option>
          <option value="fill_recommended">Fill with Recommended Value</option>
          <option value="fill_custom">Fill with Custom Value</option>
          <option value="leave_blank">Leave Blank</option>
        </select>
      </div>
      <div class="col-12 col-md-6 d-none" id="prepCustomValueWrapper">
        <label class="form-label small">Custom value</label>
        <input id="prepCustomValue" type="text" class="form-control form-control-sm" placeholder="Enter custom value">
      </div>
      ${appliedSummaryHtml}
    `;

    const columnSelection = document.getElementById('prepColumnSelection');
    const missingSelect = document.getElementById('prepMissingStrategy');
    const customValueWrapper = document.getElementById('prepCustomValueWrapper');
    const customValueInput = document.getElementById('prepCustomValue');

    const selectedColumns = Array.isArray(state.preparationOptions.selected_columns) ? state.preparationOptions.selected_columns : [];
    if (columnSelection) {
      columnSelection.innerHTML = numericFields.map((column) => {
        const isChecked = selectedColumns.includes(column);
        const hasApplied = column in state.columnStrategies;
        return `
          <label class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" value="${escapeHtml(column)}" ${isChecked ? 'checked' : ''}>
            <span class="form-check-label small${hasApplied ? ' text-primary fw-semibold' : ''}">${escapeHtml(column)}${hasApplied ? ' ✓' : ''}</span>
          </label>
        `;
      }).join('');

      Array.from(columnSelection.querySelectorAll('input[type="checkbox"]')).forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          const value = checkbox.value;
          const currentColumns = Array.isArray(state.preparationOptions.selected_columns) ? state.preparationOptions.selected_columns : [];
          if (checkbox.checked) {
            state.preparationOptions.selected_columns = Array.from(new Set([...currentColumns, value]));
          } else {
            state.preparationOptions.selected_columns = currentColumns.filter((item) => item !== value);
          }
        });
      });
    }

    if (missingSelect) {
      missingSelect.value = state.preparationOptions.missing_strategy;
      missingSelect.addEventListener('change', () => {
        state.preparationOptions.missing_strategy = missingSelect.value;
        if (customValueWrapper) {
          customValueWrapper.classList.toggle('d-none', missingSelect.value !== 'fill_custom');
        }
      });
    }

    if (customValueInput) {
      customValueInput.value = state.preparationOptions.custom_value;
      customValueInput.addEventListener('input', () => {
        state.preparationOptions.custom_value = customValueInput.value;
      });
    }
  };

  const renderRecommendations = (scan) => {
    if (!els.recommendationsList) return;
    const issues = [];
    if (scan.duplicate_count > 0) {
      issues.push({ title: 'Duplicate rows', message: `${scan.duplicate_count} duplicate rows were detected. Removing duplicates is recommended.`, type: 'warning' });
    }
    const missingColumns = Object.entries(scan.missing_counts).filter(([, count]) => Number(count) > 0);
    if (missingColumns.length > 0) {
      issues.push({ title: 'Missing values', message: `${missingColumns.length} columns contain missing values. Use mean or zero-filling for numeric columns.`, type: 'info' });
    }
    if (scan.invalid_numeric_count > 0) {
      issues.push({ title: 'Numeric annotations', message: `${scan.invalid_numeric_count} invalid numeric entries were found. Review or convert values before analysis.`, type: 'danger' });
    }
    if (scan.issue_count === 0) {
      issues.push({ title: 'Clean dataset', message: 'Your dataset looks ready. Continue to analysis or save it now.', type: 'success' });
    }

    els.recommendationsList.innerHTML = issues.map((item) => `
      <div class="col-12 col-md-6">
        <div class="border rounded-3 p-3 h-100 ${item.type === 'success' ? 'bg-success bg-opacity-10' : item.type === 'danger' ? 'bg-danger bg-opacity-10' : item.type === 'warning' ? 'bg-warning bg-opacity-10' : 'bg-info bg-opacity-10'}">
          <div class="fw-semibold mb-1">${escapeHtml(item.title)}</div>
          <div class="small text-muted">${escapeHtml(item.message)}</div>
        </div>
      </div>
    `).join('');
  };

  /**
   * Render the Preparation Preview with inline editing and row/column removal.
   * This is where users make edits – not in the raw data preview.
   */
  const renderPreview = (rows, title = 'Dataset Preview') => {
    if (!els.datasetPreviewArea) return;
    if (!Array.isArray(rows) || rows.length === 0) {
      els.datasetPreviewArea.innerHTML = '<div class="p-3 text-muted">No rows available.</div>';
      return;
    }

    const allColumns = Object.keys(rows[0]).filter((col) => col !== '__modified' && col !== '__errors' && col !== '__duplicate' && col !== '__invalid');
    const visibleColumns = allColumns.filter((col) => !state.removedColumns.includes(col));

    const headerHtml = visibleColumns.map((col) => `
      <th class="align-middle text-nowrap">
        ${escapeHtml(col)}
        <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-1 remove-col-btn" data-col="${escapeHtml(col)}" title="Remove column"><i class="bi bi-x-circle"></i></button>
      </th>
    `).join('');

    const bodyHtml = rows.map((row, index) => {
      const rowHasErrors = Array.isArray(row.__errors) && row.__errors.length > 0;
      const rowClass = rowHasErrors ? 'table-danger' : row.__modified ? 'table-success' : '';
      return `
        <tr data-row="${index}" class="${rowClass}">
          ${visibleColumns.map((col) => {
            const value = escapeHtml(row[col] ?? '');
            const editable = editableColumns.includes(col);
            const error = (row.__errors || []).find((item) => item.column === col);
            if (editable) {
              const isFilled = row.__filled_cells && row.__filled_cells[col];
              return `<td>
                <div class="editable-cell${error ? ' invalid' : ''}${isFilled ? ' filled-by-strategy' : ''}" contenteditable="true" data-row="${index}" data-col="${escapeHtml(col)}">${value}</div>
                ${error ? `<div class="invalid-feedback">${escapeHtml(error.message)}</div>` : ''}
              </td>`;
            }
            return `<td>${value}</td>`;
          }).join('')}
          <td class="text-end text-nowrap">
            <button type="button" class="btn btn-sm btn-outline-danger remove-row-btn" data-row="${index}" title="Remove row"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    els.datasetPreviewArea.innerHTML = `
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <div><strong>${escapeHtml(title)}</strong></div>
          <div class="small text-muted">${rows.length} rows shown</div>
        </div>
      </div>
      <div class="table-responsive" style="max-height:520px; overflow:auto;">
        <table class="table table-sm table-striped table-bordered mb-0">
          <thead class="table-light position-sticky top-0">
            <tr>${headerHtml}<th class="text-nowrap align-middle">Actions</th></tr>
          </thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
    `;

    // Bind inline editing on preparation preview cells
    Array.from(els.datasetPreviewArea.querySelectorAll('.editable-cell')).forEach((cell) => {
      cell.addEventListener('input', () => {
        const rowIndex = Number(cell.dataset.row);
        const column = cell.dataset.col;
        if (!Number.isFinite(rowIndex) || !column) return;
        const newValue = cell.textContent.trim();
        state.previewRows[rowIndex][column] = newValue;
        state.rawRows[rowIndex][column] = newValue;

        // If user manually edited the cell, remove the strategy filled status
        if (state.previewRows[rowIndex].__filled_cells) {
          delete state.previewRows[rowIndex].__filled_cells[column];
        }
        if (state.rawRows[rowIndex].__filled_cells) {
          delete state.rawRows[rowIndex].__filled_cells[column];
        }
        cell.classList.remove('filled-by-strategy');
      });
    });

    // Bind row removal on preparation preview
    Array.from(els.datasetPreviewArea.querySelectorAll('.remove-row-btn')).forEach((button) => {
      button.addEventListener('click', () => {
        const rowIndex = Number(button.dataset.row);
        if (!Number.isFinite(rowIndex)) return;
        state.rawRows.splice(rowIndex, 1);
        state.previewRows = state.rawRows.map((rowData) => ({ ...rowData }));
        updateValidationState();
        renderPreview(state.previewRows, 'Preparation Preview');
        renderFinalOutput(state.previewRows);
        showAlert('Row removed from dataset. Continue preparing or save when ready.', 'warning');
      });
    });

    // Bind column removal
    Array.from(els.datasetPreviewArea.querySelectorAll('.remove-col-btn')).forEach((button) => {
      button.addEventListener('click', () => {
        const col = button.dataset.col;
        if (!col) return;
        if (!state.removedColumns.includes(col)) {
          state.removedColumns.push(col);
        }
        renderPreview(state.previewRows, 'Preparation Preview');
        renderFinalOutput(state.previewRows);
        showAlert(`Column "${col}" removed from the prepared dataset.`, 'warning');
      });
    });
  };

  const renderFinalOutput = (rows) => {
    if (!els.finalOutputArea) return;
    els.finalOutputArea.innerHTML = `
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <div><strong>Final Output</strong></div>
          <div class="small text-muted">${rows.length} rows shown</div>
        </div>
      </div>
      ${buildTable(rows, { excludeColumns: state.removedColumns })}
    `;
  };

  const highlightRawPreviewRow = (rowIndex) => {
    if (!els.rawPreviewArea) return;
    const row = els.rawPreviewArea.querySelector(`tbody tr[data-row="${rowIndex}"]`);
    if (!row) return;
    row.classList.add('table-warning');
    setTimeout(() => row.classList.remove('table-warning'), 2200);
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const computeValidationState = (rows) => {
    const duplicates = {};
    rows.forEach((row, index) => {
      const studentId = String(row['Student ID'] ?? '').trim().toLowerCase();
      const studentName = String(row['Student Name'] ?? '').trim().toLowerCase();
      const key = `${studentId}||${studentName}`;
      duplicates[key] = duplicates[key] || [];
      duplicates[key].push(index);
    });

    const textOnlyFields = ['Student Name', 'Course', 'Section'];
    const strictNumericFields = [...numericFields, 'Year Level'];

    return rows.map((row, index) => {
      const errors = [];
      requiredFields.forEach((column) => {
        if (String(row[column] ?? '').trim() === '') {
          errors.push({ column, message: `${column} is required.` });
        }
      });
      textOnlyFields.forEach((column) => {
        const value = String(row[column] ?? '').trim();
        if (value !== '' && /\d/.test(value)) {
          errors.push({ column, message: `${column} cannot contain numbers.` });
        }
      });
      strictNumericFields.forEach((column) => {
        const value = String(row[column] ?? '').trim();
        if (value !== '' && !/^\d+(\.\d+)?$/.test(value)) {
          errors.push({ column, message: `${column} must be numeric.` });
        }
      });
      const studentId = String(row['Student ID'] ?? '').trim().toLowerCase();
      const studentName = String(row['Student Name'] ?? '').trim().toLowerCase();
      const duplicateKey = `${studentId}||${studentName}`;
      const duplicate = duplicateKey !== '||' && duplicates[duplicateKey]?.length > 1;
      if (duplicate) {
        errors.push({ column: 'Duplicate', message: 'Duplicate Student ID and Name detected.' });
      }
      return {
        errors,
        duplicate,
      };
    });
  };

  const updateValidationState = () => {
    const rowValidation = computeValidationState(state.rawRows);
    state.validation.rowDetails = rowValidation;
    state.validation.totalErrors = rowValidation.reduce((sum, item) => sum + item.errors.length, 0);
    state.validation.duplicateRows = rowValidation.filter((item) => item.duplicate).length;
    state.rawRows = state.rawRows.map((row, index) => ({
      ...row,
      __duplicate: rowValidation[index].duplicate,
      __errors: rowValidation[index].errors,
      __invalid: rowValidation[index].errors.length > 0,
    }));

    if (els.datasetValidationSummary) {
      if (state.validation.totalErrors === 0) {
        els.datasetValidationSummary.classList.add('d-none');
      } else {
        const missingCount = state.validation.rowDetails.reduce((count, item) => count + item.errors.filter((error) => error.message.includes('required')).length, 0);
        const invalidNumericCount = state.validation.rowDetails.reduce((count, item) => count + item.errors.filter((error) => error.message.includes('numeric') || error.message.includes('cannot contain numbers')).length, 0);
        const duplicateCount = state.validation.duplicateRows;
        els.datasetValidationSummary.textContent = `Validation errors: ${state.validation.totalErrors} — ${missingCount} required field issue(s), ${invalidNumericCount} numeric issue(s), ${duplicateCount} duplicate row(s). Fix all issues before saving.`;
        els.datasetValidationSummary.classList.remove('d-none');
      }
    }

    if (els.saveDatasetBtn) els.saveDatasetBtn.disabled = state.validation.totalErrors > 0;
    if (els.saveAndContinueBtn) els.saveAndContinueBtn.disabled = state.validation.totalErrors > 0;
    if (els.applyPreparationBtn) els.applyPreparationBtn.disabled = state.validation.totalErrors > 0;
  };

  /**
   * Render the raw preview (Check Dataset) as READ-ONLY.
   * Users can no longer edit or remove rows here – that is done in the Preparation Preview.
   */
  const renderRawPreview = () => {
    updateValidationState();
    if (!els.rawPreviewArea) return;
    if (!state.rawRows.length) {
      els.rawPreviewArea.innerHTML = '<div class="p-3 text-muted">Check dataset preview appears here.</div>';
      return;
    }

    const columns = [...Object.keys(state.rawRows[0]).filter((col) => col !== '__modified' && col !== '__errors' && col !== '__duplicate' && col !== '__invalid')];
    const headerHtml = `${columns.map((col) => `<th class="align-middle text-nowrap">${escapeHtml(col)}</th>`).join('')}<th class="align-middle text-nowrap">Duplicate</th>`;
    const bodyHtml = state.rawRows.map((row, index) => {
      const rowClass = row.__invalid ? 'table-danger' : '';
      const duplicateText = row.__duplicate ? 'Duplicate' : '';
      return `
      <tr data-row="${index}" class="${rowClass}">
        ${columns.map((col) => {
          const value = escapeHtml(row[col] ?? '');
          return `<td>${value}</td>`;
        }).join('')}
        <td>${duplicateText}</td>
      </tr>`;
    }).join('');

    els.rawPreviewArea.innerHTML = `
      <div class="table-responsive" style="max-height:520px; overflow:auto;">
        <table class="table table-sm table-striped table-bordered mb-0">
          <thead class="table-light position-sticky top-0"><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
    `;
  };

  const getSelectedPreparationColumns = () => {
    const selected = Array.isArray(state.preparationOptions.selected_columns) ? state.preparationOptions.selected_columns : [];
    return selected.filter(Boolean);
  };

  const computeColumnStatistics = (column, sourceRows) => {
    const rows = sourceRows || state.rawRows;
    const values = rows
      .map((row) => String(row[column] ?? '').trim())
      .filter((value) => value !== '' && !Number.isNaN(Number(value)))
      .map(Number);
    return values;
  };

  const getNumericAggregate = (values, strategy) => {
    if (!values.length) return '0';
    if (strategy === 'fill_mean' || strategy === 'fill_recommended') {
      const mean = values.reduce((sum, num) => sum + num, 0) / values.length;
      return String(Math.round(mean));
    }
    if (strategy === 'fill_median') {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return String(Math.round(median));
    }
    if (strategy === 'fill_mode') {
      const counts = {};
      let mode = values[0];
      values.forEach((value) => {
        counts[value] = (counts[value] || 0) + 1;
        if (counts[value] > (counts[mode] || 0)) {
          mode = value;
        }
      });
      return String(mode);
    }
    return '0';
  };

  const applyStrategyToRow = (row, columns, strategy, customValue) => {
    const updated = { ...row };
    updated.__filled_cells = updated.__filled_cells ? { ...updated.__filled_cells } : {};
    columns.forEach((column) => {
      if (!editableColumns.includes(column)) return;
      const value = String(updated[column] ?? '').trim();
      const isBlank = value === '';
      if (!isBlank && strategy !== 'fill_custom') return;
      let replacement = value;
      if (strategy === 'leave_blank') {
        replacement = '';
      } else if (strategy === 'fill_zero') {
        replacement = '0';
      } else if (strategy === 'fill_custom') {
        replacement = String(customValue ?? '').trim();
      } else if (['fill_mean', 'fill_median', 'fill_mode', 'fill_recommended'].includes(strategy)) {
        const values = computeColumnStatistics(column, state.originalRows);
        replacement = getNumericAggregate(values, strategy);
      }
      updated[column] = replacement;
      if (isBlank && replacement !== '') {
        updated.__filled_cells[column] = true;
      } else if (replacement === '') {
        delete updated.__filled_cells[column];
      }
    });
    return updated;
  };

  /**
   * Apply all stored column strategies from originalRows to produce the current rawRows.
   * This re-applies every column's strategy from scratch on the original data.
   */
  const reapplyAllStrategies = () => {
    let rows = state.originalRows.map((row) => ({ ...row }));
    for (const [column, config] of Object.entries(state.columnStrategies)) {
      rows = rows.map((row) => applyStrategyToRow(row, [column], config.strategy, config.custom_value));
    }
    return rows;
  };

  const applyPreparationChanges = () => {
    if (!state.rawRows.length) {
      showAlert('Please validate the dataset first.', 'warning');
      return;
    }
    if (state.validation.totalErrors > 0) {
      showAlert('Cannot apply preparation. Please resolve all validation errors in the dataset first.', 'danger');
      return;
    }
    const selectedColumns = getSelectedPreparationColumns();
    if (!selectedColumns.length) {
      showAlert('Select one or more columns to apply preparation.', 'warning');
      return;
    }
    const strategy = state.preparationOptions.missing_strategy;
    const customValue = state.preparationOptions.custom_value;

    // Store the strategy for each selected column
    selectedColumns.forEach((column) => {
      state.columnStrategies[column] = {
        strategy,
        custom_value: customValue,
      };
    });

    // Re-apply ALL column strategies from original data
    const updatedRows = reapplyAllStrategies();
    state.rawRows = updatedRows;
    state.previewRows = updatedRows.map((row) => ({ ...row, __modified: true }));
    updateValidationState();
    renderRawPreview();
    renderPreview(state.previewRows, 'Preparation Preview');
    renderPreparationOptions(); // Refresh to show updated applied strategies
    if (els.finalOutputCard) els.finalOutputCard.classList.remove('d-none');
    renderFinalOutput(state.previewRows);

    const appliedCols = selectedColumns.map((c) => `"${c}"`).join(', ');
    const message = state.validation.totalErrors === 0
      ? `Preparation applied to ${appliedCols}. Final output is ready for saving.`
      : `Preparation applied to ${appliedCols}, but ${state.validation.totalErrors} validation issue(s) remain. Fix them before saving.`;
    showAlert(message, state.validation.totalErrors === 0 ? 'success' : 'warning');
  };

  const previewPreparationChanges = () => {
    if (!state.rawRows.length) {
      showAlert('Please validate the dataset first.', 'warning');
      return;
    }
    const selectedColumns = getSelectedPreparationColumns();
    if (!selectedColumns.length) {
      showAlert('Select one or more columns to preview changes.', 'warning');
      return;
    }

    // Build a temporary preview: apply stored strategies + current strategy for selected columns
    let previewRows = state.originalRows.map((row) => ({ ...row }));
    // Apply all previously stored strategies
    for (const [column, config] of Object.entries(state.columnStrategies)) {
      previewRows = previewRows.map((row) => applyStrategyToRow(row, [column], config.strategy, config.custom_value));
    }
    // Apply current (unsaved) strategy for selected columns on top
    previewRows = previewRows.map((row) => applyStrategyToRow(row, selectedColumns, state.preparationOptions.missing_strategy, state.preparationOptions.custom_value));

    renderPreview(previewRows, 'Preparation Preview');
    if (els.finalOutputCard) els.finalOutputCard.classList.add('d-none');
    showAlert('Preview generated for the selected strategy. Apply it when ready.', 'info');
  };

  /**
   * Reset all preparation changes back to the original validated data.
   */
  const resetPreparation = () => {
    if (!state.originalRows.length) {
      showAlert('No original data to reset to. Please validate a dataset first.', 'warning');
      return;
    }

    // Clear all stored column strategies
    state.columnStrategies = {};
    state.removedColumns = [];

    // Restore original data
    state.rawRows = state.originalRows.map((row) => ({ ...row }));
    state.previewRows = state.rawRows.map((row) => ({ ...row }));

    // Reset preparation options to defaults
    state.preparationOptions.selected_columns = [...numericFields];
    state.preparationOptions.missing_strategy = 'fill_mean';
    state.preparationOptions.custom_value = '';

    updateValidationState();
    renderRawPreview();
    renderPreparationOptions();
    renderPreview(state.previewRows, 'Preparation Preview');
    if (els.finalOutputCard) els.finalOutputCard.classList.add('d-none');
    if (els.finalOutputArea) els.finalOutputArea.innerHTML = '<div class="p-3 text-muted">Final dataset output appears here after preparation.</div>';

    showAlert('All preparation changes have been reset to original data.', 'info');
  };

  const renderValidationView = (json) => {
    state.rawRows = Array.isArray(json.rows) ? json.rows : [];
    // Store a deep copy of original rows for reset and re-apply
    state.originalRows = state.rawRows.map((row) => ({ ...row }));
    state.previewRows = state.rawRows.map((row) => ({ ...row }));
    state.storedToken = json.stored || '';
    state.validated = true;
    state.columnStrategies = {};
    state.removedColumns = [];
    state.scan = {
      total_rows: Number(json.total_rows || 0),
      column_count: Number(json.column_count || 0),
      missing_counts: json.missing_counts || {},
      duplicate_count: Number(json.duplicate_count || 0),
      invalid_numeric_count: Number(json.invalid_numeric_count || 0),
      issue_count: Number(json.issue_count || 0),
      issues: Array.isArray(json.issues) ? json.issues : [],
      outlier_summary: json.outlier_summary || {},
    };

    if (els.uploadStored) {
      els.uploadStored.value = state.storedToken;
    }
    els.validationSummaryCard?.classList.remove('d-none');
    els.validationReportCard?.classList.remove('d-none');
    els.validationErrorsCard?.classList.remove('d-none');
    els.rawPreviewCard?.classList.remove('d-none');
    els.preparationCard?.classList.remove('d-none');
    if (els.finalOutputCard) els.finalOutputCard.classList.add('d-none');
    if (els.datasetPreviewArea) els.datasetPreviewArea.innerHTML = '<div class="p-3 text-muted">Preview dataset appears here after applying preparation.</div>';

    renderValidationSummary(state.scan);
    renderValidationReport(state.scan);
    renderErrorTable(state.scan);
    renderPreparationOptions();
    renderRecommendations(state.scan);
    updateValidationState();
    renderRawPreview();
    renderPreview(state.previewRows, 'Preparation Preview');
    renderFinalOutput(state.previewRows);
  };

  const validateDataset = async () => {
    clearAlert();
    if (!els.uploadDatasetFile || !els.uploadDatasetFile.files.length) {
      showAlert('Please select a CSV file first.', 'warning');
      return;
    }
    const datasetName = els.uploadDatasetName?.value.trim() || '';
    if (!datasetName) {
      showAlert('Dataset name is required.', 'warning');
      return;
    }
    const file = els.uploadDatasetFile.files[0];
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      showAlert('Please upload a valid CSV file.', 'danger');
      return;
    }

    const formData = new FormData();
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    formData.append('csrf_token', token);
    formData.append('dataset', file);
    formData.append('mode', 'preview');

    try {
      showAlert('Validating dataset, please wait...', 'info');
      const response = await fetch('/Data/api/datasets/upload.php', { method: 'POST', body: formData, credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Validation failed.');
      }
      renderValidationView(json);
      showAlert('Dataset validated. Review issues and prepare the dataset before saving.', 'success');
    } catch (error) {
      showAlert(error.message || 'Unable to validate dataset.', 'danger');
    }
  };

  const generatePreparationPreview = async (mode = 'clean') => {
    if (!state.validated) {
      showAlert('Please validate your dataset before applying preparation steps.', 'warning');
      return;
    }

    const formData = new FormData();
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    formData.append('csrf_token', token);
    formData.append('mode', mode);
    formData.append('remove_duplicates', state.preparationOptions.remove_duplicates ? '1' : '0');
    formData.append('missing_strategy', state.preparationOptions.missing_strategy || 'none');
    if (state.storedToken) {
      formData.append('stored', state.storedToken);
    }
    if (els.uploadDatasetFile?.files.length) {
      formData.append('dataset', els.uploadDatasetFile.files[0]);
    }
    if (state.rawRows.length) {
      formData.append('preview_data', JSON.stringify(state.rawRows));
    }

    try {
      showAlert('Generating preparation preview...', 'info');
        const response = await fetch('/Data/api/datasets/upload.php', { method: 'POST', body: formData, credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Preparation preview failed.');
      }

      const preparedRows = Array.isArray(json.preview) ? json.preview : [];
      state.previewRows = preparedRows.map((row) => ({ ...row }));
      state.rawRows = preparedRows.map((row) => ({ ...row }));
      if (els.uploadStored) {
        els.uploadStored.value = json.stored || state.storedToken;
      }
      renderRawPreview();
      renderPreview(state.previewRows, 'Preparation Preview');
      renderFinalOutput(state.previewRows);
      const summary = [];
      if (Number(json.removed_duplicates) > 0) {
        summary.push(`${json.removed_duplicates} duplicate rows removed`);
      }
      summary.push(`Missing strategy: ${escapeHtml(json.options?.missing_strategy || 'none')}`);
      showAlert(`Preparation preview generated. ${summary.join(' • ')}`, 'success');
    } catch (error) {
      showAlert(error.message || 'Unable to generate preparation preview.', 'danger');
    }
  };

  const saveDataset = async (continueToAnalysis = false) => {
    if (!state.validated) {
      showAlert('Validate the dataset before saving.', 'warning');
      return;
    }

    // Build final rows by removing excluded columns
    const finalRows = state.previewRows.map((row) => {
      const cleaned = { ...row };
      state.removedColumns.forEach((col) => delete cleaned[col]);
      delete cleaned.__modified;
      delete cleaned.__errors;
      delete cleaned.__duplicate;
      delete cleaned.__invalid;
      return cleaned;
    });

    const formData = new FormData();
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    formData.append('csrf_token', token);
    formData.append('mode', 'save');
    formData.append('dataset_name', els.uploadDatasetName?.value || '');
    formData.append('description', els.uploadDescription?.value || '');
    if (state.storedToken) {
      formData.append('stored', state.storedToken);
    }
    if (els.uploadDatasetFile?.files.length) {
      formData.append('dataset', els.uploadDatasetFile.files[0]);
    }
    formData.append('preview_data', JSON.stringify(finalRows));

    try {
      showAlert('Saving dataset...', 'info');
      const response = await fetch('/Data/api/datasets/upload.php', { method: 'POST', body: formData, credentials: 'same-origin' });
      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || 'Dataset save failed.');
      }
      showAlert(json.message || 'Dataset saved successfully.', 'success');
      if (json.dataset_id) {
        if (continueToAnalysis) {
          window.location.href = `/Data/pages/datasets/workspace.php?id=${encodeURIComponent(json.dataset_id)}`;
          return;
        }
        setTimeout(() => {
          window.location.href = `/Data/pages/datasets/index.php`;
        }, 800);
      }
    } catch (error) {
      showAlert(error.message || 'Unable to save dataset.', 'danger');
    }
  };

  const resetPage = () => {
    state.rawRows = [];
    state.originalRows = [];
    state.previewRows = [];
    state.removedColumns = [];
    state.storedToken = '';
    state.validated = false;
    state.scan = null;
    state.columnStrategies = {};
    state.preparationOptions = {
      remove_duplicates: true,
      selected_columns: [...numericFields],
      missing_strategy: 'fill_mean',
      custom_value: '',
    };
    if (els.uploadForm) els.uploadForm.reset();
    if (els.uploadStored) els.uploadStored.value = '';
    if (els.validationSummaryCard) els.validationSummaryCard.classList.add('d-none');
    if (els.validationReportCard) els.validationReportCard.classList.add('d-none');
    if (els.validationErrorsCard) els.validationErrorsCard.classList.add('d-none');
    if (els.rawPreviewCard) els.rawPreviewCard.classList.add('d-none');
    if (els.preparationCard) els.preparationCard.classList.add('d-none');
    if (els.finalOutputCard) els.finalOutputCard.classList.add('d-none');
    if (els.datasetPreviewArea) els.datasetPreviewArea.innerHTML = '<div class="p-3 text-muted">Preview dataset appears here after clicking Preview.</div>';
    if (els.rawPreviewArea) els.rawPreviewArea.innerHTML = '<div class="p-3 text-muted">Raw dataset preview appears here.</div>';
    if (els.finalOutputArea) els.finalOutputArea.innerHTML = '<div class="p-3 text-muted">Final dataset output appears here after preparation.</div>';
    clearAlert();
  };

  els.startValidationBtn?.addEventListener('click', validateDataset);
  els.previewPreparationBtn?.addEventListener('click', previewPreparationChanges);
  els.resetPreparationBtn?.addEventListener('click', resetPreparation);
  els.applyPreparationBtn?.addEventListener('click', applyPreparationChanges);
  document.getElementById('saveChangesBtn')?.addEventListener('click', () => {
    if (!state.rawRows.length) {
      showAlert('No dataset loaded to save changes.', 'warning');
      return;
    }
    updateValidationState();
    renderRawPreview();
    renderPreview(state.rawRows, 'Preparation Preview');
    const message = state.validation.totalErrors === 0 ? 'Changes saved. Dataset is valid.' : `Saved changes, but ${state.validation.totalErrors} validation issue(s) remain.`;
    showAlert(message, state.validation.totalErrors === 0 ? 'success' : 'warning');
  });
  els.saveDatasetBtn?.addEventListener('click', () => saveDataset(false));
  els.cancelBtn?.addEventListener('click', () => {
    window.location.href = '/Data/pages/datasets/index.php';
  });
  els.resetBtn?.addEventListener('click', resetPage);
  els.saveAndContinueBtn?.addEventListener('click', () => saveDataset(true));

  resetPage();
});
