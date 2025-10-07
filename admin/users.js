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
  userSearchInput && userSearchInput.addEventListener('input', filterUsers);
  const userIdSearchInput = document.getElementById('user-id-search');
  const userIdSearchBtn = document.getElementById('user-id-search-btn');
  userIdSearchBtn && userIdSearchBtn.addEventListener('click', buscarPorId);
  closeModal.addEventListener('click', hideModal);
  cancelBtn && cancelBtn.addEventListener('click', hideModal);
  statusForm.addEventListener('submit', handleStatusSubmit);
  // (opção de excluir removida do CRUD de usuários)

  // Carrega status disponíveis
async function loadStatuses() {
  try {
  const res = await fetch(`${API_BASE_URL}/users/statuses`);
    if (!res.ok) {
      const txt = await res.text();
      console.error('Erro ao carregar status:', res.status, txt);
      throw new Error(txt || `Status ${res.status}`);
    }
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
      if (!res.ok) {
        const txt = await res.text();
        console.error('Erro ao carregar usuários (status):', res.status, txt);
        throw new Error(txt || `Status ${res.status}`);
      }
      users = await res.json();
      renderUsers(users);
    } catch (err) {
      console.error('Erro no loadUsers:', err);
      showMessage('Erro ao carregar usuários.', 'error');
      users = [];
      renderUsers([]);
    }
  }

  function renderUsers(list) {
    usersContainer.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      usersContainer.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#bdb76b;padding:18px">Nenhum usuário encontrado.</td></tr>';
      return;
    }

    list.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.nickname)}</td>
        <td>${escapeHtml(renderStatusName(u.user_status))}</td>
      `;
      usersContainer.appendChild(tr);
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
    const term = (userSearchInput && userSearchInput.value) ? userSearchInput.value.trim().toLowerCase() : '';
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

  // Busca por ID chamando backend. Se encontrar: abre modal para editar status.
  async function buscarPorId() {
    const raw = userIdSearchInput.value.trim();
    if (!raw) return showMessage('Informe um ID para buscar.', 'error');
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return showMessage('ID inválido.', 'error');

    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`);
      if (res.status === 200) {
        const u = await res.json();
        // abre modal para edição de status
        if (u.id === 1) return showMessage('O Admin_Supremo não pode ter o status alterado.', 'error');
        userIdInput.value = u.id;
        userIdent.textContent = `#${u.id} — ${u.email} (${u.nickname})`;
        const option = Array.from(statusSelect.options).find(opt => Number(opt.value) === Number(u.user_status));
        if (option) option.selected = true;
        else if (statusSelect.options.length > 0) statusSelect.selectedIndex = 0;
        modal.style.display = 'block';
        return;
      }

      if (res.status === 404) {
        // não encontrado: abrir formulário de criação simples
        // vamos aproveitar o modal e apresentar campos mínimos para criar
        openCreateModalWithId(id);
        return;
      }

      const text = await res.text();
      throw new Error(text || 'Erro ao buscar usuário');
    } catch (err) {
      console.error(err);
      showMessage('Erro ao buscar usuário por ID.', 'error');
    }
  }

  function openCreateModalWithId(id) {
    // substitui temporariamente o conteúdo do modal para criar usuário com id informado
    // cria inputs dinâmicos
    userIdInput.value = id;
    userIdent.textContent = `Criar usuário com ID #${id}`;
    // assegurar que o select de status existe
    if (statusSelect.options.length > 0) statusSelect.selectedIndex = 0;
    // troca o handler do submit para criar usuário quando modal estiver em modo create
    statusForm.removeEventListener('submit', handleStatusSubmit);
    statusForm.addEventListener('submit', handleCreateFromModal);
    modal.style.display = 'block';
  }

  async function handleCreateFromModal(e) {
    e.preventDefault();
    const id = Number(userIdInput.value);
    const email = prompt('Email do novo usuário:');
    if (!email) return showMessage('Email é obrigatório.', 'error');
    const nickname = prompt('Nickname do novo usuário:');
    if (!nickname) return showMessage('Nickname é obrigatório.', 'error');
    const password = prompt('Senha do novo usuário:');
    if (!password) return showMessage('Senha é obrigatória.', 'error');
    const confirmPassword = prompt('Confirme a senha:');
    if (password !== confirmPassword) return showMessage('Senhas diferentes.', 'error');
    const status = Number(statusSelect.value) || 2;

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email, nickname, password, confirmPassword, adminCode: '' })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Erro ao criar usuário');
      }
      showMessage('Usuário criado com sucesso!', 'success');
      // restaura handler original
      statusForm.removeEventListener('submit', handleCreateFromModal);
      statusForm.addEventListener('submit', handleStatusSubmit);
      hideModal();
      await loadUsers();
    } catch (err) {
      console.error(err);
      showMessage('Erro ao criar usuário.', 'error');
    }
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