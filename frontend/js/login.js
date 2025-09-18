document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('user').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('login-error');

  const res = await fetch('http://127.0.0.1:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ user, password })
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.ok) {
    localStorage.setItem('userId', data.user.id); // Armazena o ID do usuário no localStorage
    window.location.href = 'index.html';
  } else {
    errorDiv.textContent = data.erro || data.error || 'Erro ao fazer login.';
  }
});