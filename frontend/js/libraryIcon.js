async function checkLibraryIcon() {
  try {
    const res = await fetch('http://127.0.0.1:3000/auth/me', { credentials: 'include' });
    if (!res.ok) {
      hideLibrary();
      return;
    }
    const user = await res.json();
    if (!user || !user.id) hideLibrary();
  } catch (err) {
    console.error('Erro ao verificar auth/me:', err);
    hideLibrary();
  }
}

function hideLibrary() {
  const el = document.getElementById('library');
  if (el) el.style.display = 'none';
}

// Executa na carga do script
checkLibraryIcon();

export {};
