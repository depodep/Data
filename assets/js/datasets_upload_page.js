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
  };

  const requiredFields = ['Student ID', 'Student Name', 'Course', 'Year Level', 'Section', 'Subject'];
  const numericFields = ['Quiz Score', 'Midterm Score', 'Final Score', 'Attendance'];
  const editableColumns = [...requiredFields, ...numericFields];
  const textOnlyFields = ['Student Name', 'Course', 'Section'];
  const strictNumericFields = [...numericFields, 'Year Level'];

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
    const allColumns = Object.keys(rows[0]).filter((col) => col !== '__modified' && col !== '__errors' && col !== '__duplicate' && col !== '__invalid' && col !== '__filled_cells');
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

    const allColumns = Object.keys(rows[0]).filter((col) => col !== '__modified' && col !== '__errors' && col !== '__duplicate' && col !== '__invalid' && col !== '__filled_cells');
    const visibleColumns = allColumns.filter((col) => !state.removedColumns.includes(col));

    const headerHtml = visibleColumns.map((col) => `
      <th class="align-middle text-nowrap">
        ${escapeHtml(col)}
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

      cell.addEventListener('keypress', (e) => {
        const column = cell.dataset.col;
        if (!column) return;
        
        if (strictNumericFields.includes(column)) {
          if (!/[0-9.]/.test(e.key)) {
            e.preventDefault();
          } else if (e.key === '.' && cell.textContent.includes('.')) {
            e.preventDefault();
          }
        }
        
        if (textOnlyFields.includes(column)) {
          if (/[0-9]/.test(e.key)) {
            e.preventDefault();
          }
        }
      });

      cell.addEventListener('paste', (e) => {
        const column = cell.dataset.col;
        if (!column) return;
        
        const text = (e.clipboardData || window.clipboardData).getData('text');
        
        if (strictNumericFields.includes(column)) {
          let filtered = text.replace(/[^0-9.]/g, '');
          const dots = filtered.split('.');
          if (dots.length > 2) {
            filtered = dots[0] + '.' + dots.slice(1).join('');
          }
          e.preventDefault();
          document.execCommand('insertText', false, filtered);
        } else if (textOnlyFields.includes(column)) {
          const filtered = text.replace(/[0-9]/g, '');
          e.preventDefault();
          document.execCommand('insertText', false, filtered);
        }
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

    // Column deletion disabled
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
    const metrics = {
      rowsScanned: rows.length,
      inconsistentCells: 0,
      affectedRows: 0,
      missingValues: 0,
      invalidRanges: 0,
      invalidDataTypes: 0,
    };

    rows.forEach((row, index) => {
      const studentId = String(row['Student ID'] ?? '').trim().toLowerCase();
      const studentName = String(row['Student Name'] ?? '').trim().toLowerCase();
      const key = `${studentId}||${studentName}`;
      duplicates[key] = duplicates[key] || [];
      duplicates[key].push(index);
    });

    const rowValidation = rows.map((row, index) => {
      const errors = [];
      let hasError = false;

      const addError = (col, msg, type, rule) => {
        errors.push({ column: col, message: msg, type, rule, currentValue: row[col] });
        metrics.inconsistentCells++;
        hasError = true;
        if (type === 'missing') metrics.missingValues++;
        if (type === 'type') metrics.invalidDataTypes++;
        if (type === 'range') metrics.invalidRanges++;
      };

      // Student ID
      const sid = String(row['Student ID'] ?? '').trim();
      if (!sid) addError('Student ID', 'Missing value', 'missing', 'Required');

      // Student Name
      const sname = String(row['Student Name'] ?? '').trim();
      if (!sname) addError('Student Name', 'Missing value', 'missing', 'Required');
      else if (!/^[a-zA-Z\s.,\-]+$/.test(sname)) addError('Student Name', 'Contains invalid characters', 'type', 'Cannot contain numbers or special symbols (except , . -)');
      const course = String(row['Course'] ?? '').trim();
      if (!course) addError('Course', 'Missing value', 'missing', 'Required');

      // Year Level
      const ylevel = String(row['Year Level'] ?? '').trim();
      if (!ylevel) addError('Year Level', 'Missing value', 'missing', 'Integer only: 1, 2, 3, or 4');
      else if (!['1', '2', '3', '4'].includes(ylevel)) addError('Year Level', 'Invalid year level', 'type', 'Integer only: 1, 2, 3, or 4');

      // Section
      const sec = String(row['Section'] ?? '').trim();
      if (!sec) addError('Section', 'Missing value', 'missing', 'Required');

      // Subject
      const subj = String(row['Subject'] ?? '').trim();
      if (!subj) addError('Subject', 'Missing value', 'missing', 'Required');

      // Scores and Attendance
      const numericCols = ['Quiz Score', 'Midterm Score', 'Final Score', 'Attendance'];
      numericCols.forEach(col => {
        const valStr = String(row[col] ?? '').trim();
        if (!valStr) {
          addError(col, 'Missing value', 'missing', 'Must be numeric (0-100)');
        } else if (!/^\d+(\.\d+)?$/.test(valStr)) {
          addError(col, 'Contains non-numeric characters', 'type', 'Must be numeric (0-100)');
        } else {
          const num = parseFloat(valStr);
          if (num < 0 || num > 100) {
            addError(col, 'Value out of range', 'range', 'Must be numeric (0-100)');
          }
        }
      });

      const studentIdLower = sid.toLowerCase();
      const studentNameLower = sname.toLowerCase();
      const duplicateKey = `${studentIdLower}||${studentNameLower}`;
      const duplicate = duplicateKey !== '||' && duplicates[duplicateKey]?.length > 1;
      if (duplicate) {
        addError('Duplicate', 'Duplicate Student ID and Name detected.', 'type', 'Must be unique');
      }

      if (hasError) metrics.affectedRows++;

      return { errors, duplicate };
    });

    return { rowValidation, metrics };
  };

  const updateValidationState = (skipErrorTableRender = false) => {
    if (!state.rawRows || state.rawRows.length === 0) return;
    const validationResult = computeValidationState(state.rawRows);
    const rowValidation = validationResult.rowValidation;
    state.validation.metrics = validationResult.metrics;
    
    state.validation.rowDetails = rowValidation;
    state.validation.totalErrors = rowValidation.reduce((sum, item) => sum + item.errors.length, 0);
    state.validation.duplicateRows = rowValidation.filter((item) => item.duplicate).length;
    
    state.rawRows = state.rawRows.map((row, index) => ({
      ...row,
      __duplicate: rowValidation[index].duplicate,
      __errors: rowValidation[index].errors,
      __invalid: rowValidation[index].errors.length > 0,
    }));
    if (state.previewRows && state.previewRows.length === state.rawRows.length) {
      state.previewRows = state.previewRows.map((row, index) => ({
        ...row,
        __duplicate: rowValidation[index].duplicate,
        __errors: rowValidation[index].errors,
        __invalid: rowValidation[index].errors.length > 0,
      }));
    }

    renderValidationSummary();
    if (!skipErrorTableRender) {
      renderValidationErrorsTable();
    }

    if (els.datasetValidationSummary) {
      if (state.validation.totalErrors === 0) {
        els.datasetValidationSummary.classList.add('d-none');
      } else {
        els.datasetValidationSummary.classList.remove('d-none');
      }
    }

    const hasErrors = state.validation.totalErrors > 0;
    if (els.saveDatasetBtn) els.saveDatasetBtn.disabled = hasErrors;
    if (els.applyPreparationBtn) els.applyPreparationBtn.disabled = hasErrors;
  };

  const renderValidationSummary = () => {
    if (!els.validationSummaryCards) return;
    const m = state.validation.metrics;
    if (!m) return;
    
    const readyForSave = state.validation.totalErrors === 0;
    const readyBadge = readyForSave ? `<span class="badge bg-success">Yes</span>` : `<span class="badge bg-danger">No</span>`;

    els.validationSummaryCards.innerHTML = `
      <div class="col-12"><div class="d-flex justify-content-between border-bottom pb-2"><span>Rows scanned</span><strong>${m.rowsScanned}</strong></div></div>
      <div class="col-12"><div class="d-flex justify-content-between border-bottom pb-2"><span>Inconsistent cells</span><strong class="text-danger">${m.inconsistentCells}</strong></div></div>
      <div class="col-12"><div class="d-flex justify-content-between border-bottom pb-2"><span>Affected rows</span><strong class="text-warning">${m.affectedRows}</strong></div></div>
      <div class="col-12"><div class="d-flex justify-content-between border-bottom pb-2"><span>Missing values</span><strong>${m.missingValues}</strong></div></div>
      <div class="col-12"><div class="d-flex justify-content-between border-bottom pb-2"><span>Invalid ranges</span><strong>${m.invalidRanges}</strong></div></div>
      <div class="col-12"><div class="d-flex justify-content-between border-bottom pb-2"><span>Invalid data types</span><strong>${m.invalidDataTypes}</strong></div></div>
      <div class="col-12"><div class="d-flex justify-content-between pt-1"><span>Ready for save for data set</span>${readyBadge}</div></div>
    `;
    if (els.validationSummaryCard) els.validationSummaryCard.classList.remove('d-none');
  };

  const renderValidationErrorsTable = () => {
    if (!els.validationErrorsTable || !els.validationErrorsCard) return;
    
    if (state.validation.totalErrors === 0) {
      els.validationErrorsCard.classList.add('d-none');
      return;
    }
    
    els.validationErrorsCard.classList.remove('d-none');
    
    if (els.errorsCountBadge) {
      els.errorsCountBadge.textContent = `${state.validation.totalErrors} issues`;
      els.errorsCountBadge.className = 'badge bg-danger text-white';
    }
    
    let rowsHtml = '';
    
    state.validation.rowDetails.forEach((rowItem, rowIndex) => {
      rowItem.errors.forEach((err) => {
        const isEditable = err.column !== 'Duplicate';
        const val = isEditable ? (err.currentValue || '') : 'N/A';
        
        rowsHtml += `
          <tr class="table-danger" data-row="${rowIndex}" data-col="${err.column}">
            <td>Row ${rowIndex + 1}</td>
            <td>${escapeHtml(err.column)}</td>
            <td class="bg-white px-2 py-1">${escapeHtml(val)}</td>
            <td class="err-msg text-danger">${escapeHtml(err.message)}</td>
            <td class="small text-muted">${escapeHtml(err.rule)}</td>
            <td>${isEditable ? `<button class="btn btn-sm btn-secondary go-to-row-btn" data-row="${rowIndex}">Edit Inline</button>` : ''}</td>
          </tr>
        `;
      });
    });
    
    els.validationErrorsTable.innerHTML = rowsHtml;
    
    Array.from(els.validationErrorsTable.querySelectorAll('.go-to-row-btn')).forEach((btn) => {
      btn.addEventListener('click', () => {
        const rowIndex = Number(btn.dataset.row);
        if (!Number.isFinite(rowIndex)) return;
        
        // Scroll to the dataset preview area and highlight the row
        if (els.datasetPreviewArea) {
          els.datasetPreviewArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const targetRow = els.datasetPreviewArea.querySelector(`tr[data-row="${rowIndex}"]`);
          if (targetRow) {
            targetRow.classList.add('table-warning');
            setTimeout(() => {
              targetRow.classList.remove('table-warning');
            }, 3000);
            
            // Try to find the editable cell inside it
            const colName = btn.closest('tr').dataset.col;
            if (colName) {
               const tableHeaders = Array.from(els.datasetPreviewArea.querySelectorAll('th')).map(th => th.textContent.trim());
               const colIdx = tableHeaders.indexOf(colName);
               if (colIdx >= 0) {
                 const td = targetRow.cells[colIdx];
                 if (td && td.hasAttribute('contenteditable')) {
                    td.focus();
                 }
               }
            }
          }
        }
      });
    });
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
      if (!isBlank) return;
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

    // Store the strategy for each selected column to show in UI
    selectedColumns.forEach((column) => {
      state.columnStrategies[column] = {
        strategy,
        custom_value: customValue,
      };
    });

    // Incrementally apply the new strategy to the current working data
    let updatedRows = state.rawRows.map((row) => ({ ...row }));
    updatedRows = updatedRows.map((row) => applyStrategyToRow(row, selectedColumns, strategy, customValue));
    
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

    // Build a temporary preview: incrementally apply current strategy on top of working data
    let previewRows = state.rawRows.map((row) => ({ ...row }));
    previewRows = previewRows.map((row) => applyStrategyToRow(row, selectedColumns, state.preparationOptions.missing_strategy, state.preparationOptions.custom_value));

    state.previewRows = previewRows;
    renderPreview(state.previewRows, 'Preparation Preview');
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

  const saveDataset = async () => {
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
      window.location.href = '/Data/pages/datasets/index.php';
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
    state.rawRows = state.previewRows.map((row) => ({ ...row }));
    updateValidationState();
    renderRawPreview();
    renderPreview(state.previewRows, 'Preparation Preview');
    const message = state.validation.totalErrors === 0 ? 'Changes saved. Dataset is valid.' : `Saved changes, but ${state.validation.totalErrors} validation issue(s) remain.`;
    showAlert(message, state.validation.totalErrors === 0 ? 'success' : 'warning');
  });
  els.saveDatasetBtn?.addEventListener('click', () => saveDataset(false));
  els.cancelBtn?.addEventListener('click', () => {
    window.location.href = '/Data/pages/datasets/index.php';
  });
  els.resetBtn?.addEventListener('click', resetPage);

  resetPage();
});
