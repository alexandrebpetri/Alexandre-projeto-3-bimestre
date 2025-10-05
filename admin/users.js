// users.js
document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = 'http://127.0.0.1:3000';

  // DOM
  const usersContainer = document.getElementById('users-container');
  const messageContainer = document.getElementById('message-container');
  const userSearchInput = document.getElementById('user-search');

  // Modal elements
  const modal = document.getElementById('status-modal');
  const closeModal = document.querySelector('#status-modal .close-modal');
  const cancelBtn = document.getElementById('cancel-status-btn');
  const statusForm = document.getElementById('status-form');
  const statusSelect = document.getElementById('status-select');
  const userIdInput = document.getElementById('user-id');
  const userIdent = document.getElementById('user-ident');

  let users = [];
  let statuses = [];

  // Inicializa
  await Promise.all([loadStatuses(), loadUsers()]);

  // Eventos
  userSearchInput.addEventListener('input', filterUsers);
  closeModal.addEventListener('click', hideModal);
  cancelBtn && cancelBtn.addEventListener('click', hideModal);
  statusForm.addEventListener('submit', handleStatusSubmit);

  // Carrega status disponíveis
async function loadStatuses() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/status`);
    statuses = await res.json();
    populateStatusSelect();
  } catch (err) {
    showMessage('Erro ao carregar lista de status.', 'error');
    statuses = [];
    populateStatusSelect();
  }
}


  function populateStatusSelect() {
    statusSelect.innerHTML = '';
    if (!Array.isArray(statuses) || statuses.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nenhum status disponível';
      statusSelect.appendChild(opt);
      return;
    }
    statuses.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      statusSelect.appendChild(opt);
    });
  }

  // Carrega usuários
  async function loadUsers() {
    try {
      const res = await fetch(`${API_BASE_URL}/users`); // endpoint esperado
      users = await res.json();
      renderUsers(users);
    } catch (err) {
      showMessage('Erro ao carregar usuários.', 'error');
      users = [];
      renderUsers([]);
    }
  }

  function renderUsers(list) {
    usersContainer.innerHTML = '';
    if (!list || list.length === 0) {
      usersContainer.innerHTML = '<div class="no-developers">Nenhum usuário encontrado.</div>';
      return;
    }

    list.forEach(u => {
      const card = document.createElement('div');
      card.className = 'developer-card'; // reaproveita classe para visual igual
      card.innerHTML = `
        <div style="flex:1">
          <div class="developer-info">#${u.id} — ${escapeHtml(u.email)}</div>
          <div style="color:#bdb76b; margin-top:6px;">${escapeHtml(u.nickname)} • ${renderStatusName(u.user_status)}</div>
        </div>
        <div class="card-actions">
          <button class="edit-btn" data-id="${u.id}" title="Editar Status" ${u.id === 1 ? 'disabled' : ''}>
            <img src="/../assets/edit-icon.png" alt="Editar" class="icon-medium">
          </button>
        </div>
      `;
      usersContainer.appendChild(card);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = Number(e.currentTarget.dataset.id);
        openEditModal(id);
      });
    });
  }

  function renderStatusName(statusId) {
    const s = statuses.find(x => x.id === statusId);
    return s ? s.name : `status(${statusId ?? '—'})`;
  }

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Busca/filtra
  function filterUsers() {
    const term = userSearchInput.value.trim().toLowerCase();
    const filtered = users.filter(u => {
      return (u.email && u.email.toLowerCase().includes(term)) ||
             (u.nickname && u.nickname.toLowerCase().includes(term)) ||
             String(u.id) === term;
    });
    renderUsers(filtered);
  }

  // Modal
  function openEditModal(id) {
    const u = users.find(x => x.id === id);
    if (!u) {
      showMessage('Usuário não encontrado.', 'error');
      return;
    }
    // Proteção front-end: admin supremo (id=1) não pode ser alterado
    if (u.id === 1) {
      showMessage('O Admin_Supremo não pode ter o status alterado.', 'error');
      return;
    }

    userIdInput.value = u.id;
    userIdent.textContent = `#${u.id} — ${u.email} (${u.nickname})`;
    // selecionar o status atual (se existir)
    const option = Array.from(statusSelect.options).find(opt => Number(opt.value) === Number(u.user_status));
    if (option) option.selected = true;
    else if (statusSelect.options.length > 0) statusSelect.selectedIndex = 0;

    modal.style.display = 'block';
  }

  function hideModal() {
    modal.style.display = 'none';
    statusForm.reset();
    userIdInput.value = '';
    userIdent.textContent = '';
  }

  // Submit alteração de status
  async function handleStatusSubmit(e) {
    e.preventDefault();
    const id = Number(userIdInput.value);
    if (!id) {
      showMessage('ID inválido.', 'error');
      return;
    }
    if (id === 1) {
      showMessage('O Admin_Supremo não pode ter o status alterado.', 'error');
      return;
    }
    const newStatusId = Number(statusSelect.value);
    if (!newStatusId) {
      showMessage('Selecione um status válido.', 'error');
      return;
    }

    try {
      // endpoint PUT esperado: /users/:id/status
      const res = await fetch(`${API_BASE_URL}/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_status: newStatusId })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Erro ao salvar status');
      }

      showMessage('Status atualizado com sucesso!', 'success');
      hideModal();
      await loadUsers();
    } catch (err) {
      console.error(err);
      showMessage('Erro ao atualizar status.', 'error');
    }
  }

  // Mensagens
  function showMessage(text, type = 'success') {
    const message = document.createElement('div');
    message.className = `message ${type === 'error' ? 'error' : 'success'}`;
    message.textContent = text;
    messageContainer.appendChild(message);
    setTimeout(() => message.remove(), 3500);
  }

  // Fecha modal se clicar fora do conteúdo
  window.addEventListener('click', (ev) => {
    if (ev.target === modal) hideModal();
  });

});