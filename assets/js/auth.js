document.addEventListener('DOMContentLoaded', () => {
  const alertBox = document.getElementById('loginAlert');
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const showAlert = (message, type = 'danger') => {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('d-none');
  };

  // Email/password login (admin/teacher)
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (alertBox) alertBox.classList.add('d-none');

      const formData = new FormData(form);
      formData.set('csrf_token', csrfToken);

      let response;
      try {
        response = await fetch('/Data/api/auth/login.php', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrfToken },
          body: formData,
        });
      } catch (err) {
        showAlert('Network error during login.');
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (err) {
        const text = await response.text();
        showAlert('Unexpected server response: ' + text.substring(0, 300));
        return;
      }

      if (!result.success) {
        showAlert(result.message || 'Login failed.');
        return;
      }

      // role-based redirect
      const role = result.user?.role_slug || '';
      if (role === 'administrator' || role === 'teacher') {
        window.location.href = '/Data/pages/dashboard/index.php';
      } else if (role === 'student') {
        window.location.href = '/Data/pages/students/summary.php';
      } else {
        window.location.href = '/Data/pages/dashboard/index.php';
      }
    });
  }

  // Student login via student_id
  const studentForm = document.getElementById('studentLoginForm');
  if (studentForm) {
    studentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (alertBox) alertBox.classList.add('d-none');

      const formData = new FormData(studentForm);
      formData.set('csrf_token', csrfToken);

      let response;
      try {
        response = await fetch('/Data/api/auth/student_login.php', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrfToken },
          body: formData,
        });
      } catch (err) {
        showAlert('Network error during student login.');
        return;
      }

      // Try parse JSON, but fall back to text if server returns HTML/error page
      let result;
      try {
        result = await response.json();
      } catch (err) {
        const text = await response.text();
        showAlert('Unexpected server response: ' + text.substring(0, 300));
        return;
      }

      if (!result.success) {
        showAlert(result.message || 'Student login failed.');
        return;
      }

      // Student always goes to summary
      window.location.href = '/Data/pages/students/summary.php';
    });
  }

  const registerForm = document.getElementById('studentRegisterForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (alertBox) alertBox.classList.add('d-none');

      const formData = new FormData(registerForm);
      formData.set('csrf_token', csrfToken);

      let response;
      try {
        response = await fetch('/Data/api/auth/student_register.php', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrfToken },
          body: formData,
        });
      } catch (err) {
        showAlert('Network error during registration.');
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (err) {
        const text = await response.text();
        showAlert('Unexpected server response: ' + text.substring(0, 300));
        return;
      }

      if (!result.success) {
        showAlert(result.message || 'Registration failed.');
        return;
      }

      window.location.href = '/Data/pages/students/summary.php';
    });
  }
});
