export async function getUserLibraryIds() {
  try {
    const me = await fetch('http://127.0.0.1:3000/auth/me', { credentials: 'include' });
    if (!me.ok) return new Set();
    const user = await me.json();
    if (!user || !user.id) return new Set();
    const res = await fetch(`http://127.0.0.1:3000/api/library/${user.id}`, { credentials: 'include' });
    if (!res.ok) return new Set();
    const list = await res.json();
    const ids = new Set(list.map(i => i.id));
    return ids;
  } catch (err) {
    console.error('Erro ao carregar biblioteca do usuário:', err);
    return new Set();
  }
}
