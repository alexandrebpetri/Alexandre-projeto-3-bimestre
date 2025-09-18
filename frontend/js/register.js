document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const nickname = document.getElementById('nickname').value.trim();
  const password = document.getElementById('password').value;
  const confirm = document.getElementById('confirm-password').value;
  const errorDiv = document.getElementById('register-error');

  if (password !== confirm) {
    errorDiv.textContent = 'As senhas não coincidem.';
    return;
  }

  const res = await fetch('http://127.0.0.1:3000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, nickname, password, confirmPassword: confirm })
  });
  const data = await res.json();
  if (res.ok) {
    window.location.href = 'index.html';
  } else {
    errorDiv.textContent = data.erro || data.error || 'Erro ao registrar.';
  }
});