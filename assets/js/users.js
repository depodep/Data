document.addEventListener('DOMContentLoaded', () => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const tableBody = document.getElementById('usersTableBody');
  const usersMeta = document.getElementById('usersMeta');
  const pagination = document.getElementById('usersPagination');
  const alertBox = document.getElementById('usersAlert');
  const searchInput = document.getElementById('searchUsers');
  const perPageSelect = document.getElementById('perPage');
  const roleSelect = document.getElementById('role_id');
  const modalElement = document.getElementById('userModal');
  const userModal = new bootstrap.Modal(modalElement);
  const form = document.getElementById('userForm');
  const modalTitle = document.getElementById('userModalTitle');
  const openCreateButton = document.getElementById('openCreateUser');

  let currentPage = 1;
  const usersCache = new Map();

  const showAlert = (message, type = 'success') => {
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
    window.setTimeout(() => alertBox.classList.add('d-none'), 3000);
  };

  const loadRoles = async () => {
    const response = await fetch('/Data/api/admin/users.php?action=roles', {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    });
    const result = await response.json();

    roleSelect.innerHTML = result.data.map((role) => `<option value="${role.role_id}" data-slug="${role.role_slug}">${role.role_name}</option>`).join('');
    handleRoleChange();
  };

  const renderPagination = (meta) => {
    pagination.innerHTML = '';

    if (meta.total_pages <= 1) return;

    const pages = [];
    if (currentPage > 1) pages.push({ label: 'Previous', page: currentPage - 1 });
    for (let page = 1; page <= meta.total_pages; page += 1) {
      pages.push({ label: String(page), page, active: page === currentPage });
    }
    if (currentPage < meta.total_pages) pages.push({ label: 'Next', page: currentPage + 1 });

    pagination.innerHTML = pages.map((item) => `
      <li class="page-item ${item.active ? 'active' : ''}">
        <button class="page-link" data-page="${item.page}">${item.label}</button>
      </li>
    `).join('');

    pagination.querySelectorAll('button[data-page]').forEach((button) => {
      button.addEventListener('click', () => {
        currentPage = Number(button.dataset.page);
        loadUsers();
      });
    });
  };

  const loadUsers = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role') || '';
    const params = new URLSearchParams({
      action: 'list',
      search: searchInput.value.trim(),
      page: String(currentPage),
      per_page: perPageSelect.value,
    });
    if (roleParam) {
      params.set('role', roleParam);
    }

    const response = await fetch(`/Data/api/admin/users.php?${params.toString()}`, {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    });

    const result = await response.json();
    const rows = result.data || [];

    usersCache.clear();
    rows.forEach((user) => {
      usersCache.set(String(user.user_id), user);
    });

    const tableRole = tableBody.dataset.role || '';
    const idCell = (user) => {
      if (tableRole === 'student') {
        return `<td>${escapeHtml(user.student_id || '-')}</td>`;
      }
      if (tableRole === 'administrator' || tableRole === 'teacher') {
        return `<td>${escapeHtml(user.employee_id || '-')}</td>`;
      }
      // No role filter — show both
      return `<td>${escapeHtml(user.student_id || '-')}</td><td>${escapeHtml(user.employee_id || '-')}</td>`;
    };

    const emptyColspan = (tableRole === 'student' || tableRole === 'administrator' || tableRole === 'teacher') ? 6 : 7;
    tableBody.innerHTML = rows.length === 0
      ? `<tr><td colspan="${emptyColspan}" class="text-center text-muted py-4">No users found.</td></tr>`
      : rows.map((user) => `
          <tr>
            <td>${escapeHtml(user.full_name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.role_name)}</td>
            <td><span class="badge text-bg-${user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'secondary'}">${escapeHtml(user.status)}</span></td>
            ${idCell(user)}
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-user-id="${user.user_id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete" data-user-id="${user.user_id}">Delete</button>
            </td>
          </tr>
        `).join('');

    usersMeta.textContent = `Showing ${rows.length} of ${result.meta.total} users`;
    renderPagination(result.meta);

    tableBody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', () => {
        const user = usersCache.get(String(button.dataset.userId));
        openForm('update', user);
      });
    });

    tableBody.querySelectorAll('button[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this user?')) return;

        const formData = new FormData();
        formData.set('action', 'delete');
        formData.set('id', button.dataset.userId);
        formData.set('csrf_token', csrfToken);

        const responseDelete = await fetch('/Data/api/admin/users.php', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          body: formData,
        });

        const resultDelete = await responseDelete.json();
        showAlert(resultDelete.message, resultDelete.success ? 'success' : 'danger');
        if (resultDelete.success) loadUsers();
      });
    });
  };

  const openForm = (mode, user = {}) => {
    form.reset();
    document.getElementById('userId').value = user.user_id || '';
    document.getElementById('full_name').value = user.full_name || '';
    document.getElementById('user_email').value = user.email || '';
    document.getElementById('role_id').value = user.role_id || roleSelect.options[0]?.value || '';
    document.getElementById('status').value = user.status || 'active';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('student_id').value = user.student_id || '';
    document.getElementById('employee_id').value = user.employee_id || '';
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm_password');
    const confirmContainer = document.getElementById('confirm_password_container');
    const passwordError = document.getElementById('passwordError');
    const confirmError = document.getElementById('confirmPasswordError');

    passwordInput.value = '';
    confirmInput.value = '';
    passwordInput.placeholder = mode === 'create'
      ? 'Required – min. 8 characters'
      : 'Leave blank to keep current password';
    passwordInput.classList.remove('is-invalid');
    confirmInput.classList.remove('is-invalid');
    if (passwordError) passwordError.textContent = '';
    if (confirmError) confirmError.textContent = '';

    // Show confirm password only on create
    confirmContainer.style.display = mode === 'create' ? '' : 'none';

    modalTitle.textContent = mode === 'create' ? 'Create User' : 'Update User';
    form.dataset.action = mode;
    handleRoleChange();
    userModal.show();
  };

  const handleRoleChange = () => {
    const option = roleSelect.options[roleSelect.selectedIndex];
    if (!option) return;
    const slug = option.dataset.slug;
    const studentContainer = document.getElementById('student_container');
    const employeeContainer = document.getElementById('employee_container');
    
    if (slug === 'student') {
      studentContainer.style.display = '';
      document.getElementById('student_id').required = true;
      employeeContainer.style.display = 'none';
      document.getElementById('employee_id').required = false;
    } else if (slug === 'teacher' || slug === 'administrator') {
      studentContainer.style.display = 'none';
      document.getElementById('student_id').required = false;
      employeeContainer.style.display = '';
    } else {
      studentContainer.style.display = '';
      employeeContainer.style.display = '';
    }
  };
  roleSelect.addEventListener('change', handleRoleChange);

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  openCreateButton.addEventListener('click', () => openForm('create'));
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    loadUsers();
  });
  perPageSelect.addEventListener('change', () => {
    currentPage = 1;
    loadUsers();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const action = form.dataset.action || 'create';
    formData.set('action', action);
    formData.set('csrf_token', csrfToken);

    // Front-end password validation
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm_password');
    const passwordError = document.getElementById('passwordError');
    const confirmError = document.getElementById('confirmPasswordError');
    const passwordValue = passwordInput.value;
    const confirmValue = confirmInput.value;

    passwordInput.classList.remove('is-invalid');
    confirmInput.classList.remove('is-invalid');
    if (passwordError) passwordError.textContent = '';
    if (confirmError) confirmError.textContent = '';

    if (action === 'create') {
      // Password required on create
      if (passwordValue.trim() === '') {
        passwordInput.classList.add('is-invalid');
        if (passwordError) passwordError.textContent = 'Password is required when creating a user.';
        passwordInput.focus();
        return;
      }
      // Minimum length
      if (passwordValue.length < 8) {
        passwordInput.classList.add('is-invalid');
        if (passwordError) passwordError.textContent = 'Password must be at least 8 characters.';
        passwordInput.focus();
        return;
      }
      // Confirm password must match
      if (confirmValue !== passwordValue) {
        confirmInput.classList.add('is-invalid');
        if (confirmError) confirmError.textContent = 'Passwords do not match.';
        confirmInput.focus();
        return;
      }
    } else {
      // On update: only validate if a new password was entered
      if (passwordValue !== '' && passwordValue.length < 8) {
        passwordInput.classList.add('is-invalid');
        if (passwordError) passwordError.textContent = 'Password must be at least 8 characters.';
        passwordInput.focus();
        return;
      }
    }

    const response = await fetch('/Data/api/admin/users.php', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      body: formData,
    });

    const result = await response.json();

    if (!result.success) {
      showAlert(result.message || 'Operation failed.', 'danger');
      return;
    }

    userModal.hide();
    showAlert(result.message, 'success');
    loadUsers();
  });

  loadRoles().then(loadUsers);
});
