document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginAlert = document.getElementById('loginAlert');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await response.json();
        if (response.ok) {
          // Store token and redirect with token in URL
          localStorage.setItem('adminToken', data.token);
          window.location.href = `/admin.html?token=${encodeURIComponent(data.token)}`;
        } else {
          localStorage.removeItem('adminToken'); // Clear token on failure
          showAlert(data.error || 'Invalid password', 'danger');
        }
      } catch (error) {
        localStorage.removeItem('adminToken'); // Clear token on error
        showAlert('Error logging in', 'danger');
        console.error('Login error:', error);
      }
    });
  }

  function showAlert(message, type) {
    if (loginAlert) {
      loginAlert.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
      setTimeout(() => loginAlert.innerHTML = '', 3000);
    }
  }
});