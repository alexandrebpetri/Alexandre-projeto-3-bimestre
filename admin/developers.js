document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = 'http://127.0.0.1:3000';

  // DOM Elements
  const developersContainer = document.getElementById('developers-container');
  const developerForm = document.getElementById('developer-form-inline');
  const cancelBtn = document.getElementById('cancel-developer-btn');
  const messageContainer = document.getElementById('message-container');
  // global search removed from UI; keep only id search
// Escapa string para uso seguro no DOM
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

 
  const developerSearchInput = document.getElementById('developer-search');
  const searchIdInput = document.getElementById('search-id');
  const btnSearchId = document.getElementById('btn-search-id');
  const editBtn = document.getElementById('edit-developer-btn');
  const saveBtn = document.getElementById('save-developer-btn');

  let developers = [];
  let editingDeveloperId = null;
  let searchedId = null;

  // Inicialização
  await loadDevelopers();

  // bloquear campos inicialmente
  setFormDisabled(true);

  // esconder painel esquerdo até o usuário buscar por ID
  const splitLeft = document.querySelector('.split-left');
  function collapseLeftPanel() { if (splitLeft) splitLeft.classList.add('collapsed-left'); }
  function expandLeftPanel() { if (splitLeft) splitLeft.classList.remove('collapsed-left'); }
  collapseLeftPanel();

  // Event Listeners (UI simplified: no add/global search)
  cancelBtn && cancelBtn.addEventListener('click', () => onCancel());
  developerForm && developerForm.addEventListener('submit', handleFormSubmit);
  btnSearchId && btnSearchId.addEventListener('click', buscarPorId);
  editBtn && editBtn.addEventListener('click', () => enableEditing());
  saveBtn && saveBtn.addEventListener('click', () => developerForm.requestSubmit());
  const deleteDeveloperBtn = document.getElementById('delete-developer-btn');
  deleteDeveloperBtn && deleteDeveloperBtn.addEventListener('click', async () => {
    const id = document.getElementById('developer-id').value;
    if (!id) return showMessage('ID inválido para exclusão', 'error');
    if (!confirm('Tem certeza que deseja excluir este desenvolvedor?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/developers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text(); throw new Error(txt || 'Erro ao excluir');
      }
      showMessage('Desenvolvedor excluído!', 'success');
      onAfterDelete();
      await loadDevelopers();
    } catch (err) {
      console.error(err);
      showMessage('Falha ao excluir desenvolvedor.', 'error');
    }
  });
  developerSearchInput && developerSearchInput.addEventListener('input', filterDevelopers);

  // Carregar desenvolvedores
  async function loadDevelopers() {
    const res = await fetch(`${API_BASE_URL}/developers`);
    developers = await res.json();
    renderDevelopers(developers);
  }

  // Renderizar desenvolvedores em cards
  function renderDevelopers(devsToRender) {
    developersContainer.innerHTML = '';
    if (!Array.isArray(devsToRender) || devsToRender.length === 0) {
      developersContainer.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#bdb76b;padding:18px">Nenhum desenvolvedor encontrado.</td></tr>';
      return;
    }
    devsToRender.forEach(dev => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
          <td>${dev.id}</td>
          <td>${escapeHtml(dev.name)}</td>
        `;
      developersContainer.appendChild(tr);
    });
      // Ações removidas (não há botões na tabela)
  }

  // enableActions removed: tabela não possui botões de ação

  // Filtro de busca
  function filterDevelopers() {
    const searchTerm = developerSearchInput.value.toLowerCase();
    const filtered = developers.filter(dev => dev.name.toLowerCase().includes(searchTerm));
    renderDevelopers(filtered);
  }

  // Modal
  function showDeveloperForm(developerId = null) {
    const panelTitle = document.getElementById('panel-title');
    developerForm.reset();
    editingDeveloperId = null;
    document.getElementById('developer-id').value = '';
    if (developerId) {
      const dev = developers.find(d => d.id == developerId);
      if (dev) {
        document.getElementById('developer-id').value = dev.id;
        document.getElementById('developer-name').value = dev.name;
        panelTitle.textContent = 'Editar Desenvolvedor';
        editingDeveloperId = dev.id;
        if (deleteDeveloperBtn) deleteDeveloperBtn.style.display = 'inline-block';
        if (editBtn) editBtn.style.display = 'inline-block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.style.display = 'none';
        setFormDisabled(true);
      }
    } else {
      panelTitle.textContent = 'Adicionar Novo Desenvolvedor';
      if (deleteDeveloperBtn) deleteDeveloperBtn.style.display = 'none';
      if (editBtn) editBtn.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
      if (saveBtn) saveBtn.style.display = 'inline-block';
      setFormDisabled(false);
    }
  // mostrar o painel esquerdo quando o formulário é aberto
  expandLeftPanel();
  }

  function hideForm() {
    const panelTitle = document.getElementById('panel-title');
    // Preserve search and id values so the user doesn't lose the searched id
    const searchInput = document.getElementById('search-id');
    const searchVal = searchInput ? searchInput.value : '';
    const hiddenId = document.getElementById('developer-id');
    const hiddenVal = hiddenId ? hiddenId.value : '';
    developerForm.reset();
    // restore preserved values
    if (searchInput) searchInput.value = searchVal;
    if (hiddenId) hiddenId.value = hiddenVal;
    editingDeveloperId = null;
    if (deleteDeveloperBtn) deleteDeveloperBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    if (panelTitle) panelTitle.textContent = 'Desenvolvedor';
    setFormDisabled(true);
    // colapsar o painel esquerdo novamente (mantém o campo de busca visível)
    collapseLeftPanel();
    // re-enable search input/button
    if (searchIdInput) searchIdInput.disabled = false;
    if (btnSearchId) btnSearchId.disabled = false;
  }

  // Formulário
  async function handleFormSubmit(e) {
    e.preventDefault();
    const developerId = document.getElementById('developer-id').value;
    const name = document.getElementById('developer-name').value.trim();
    if (!name) {
      showMessage('O nome é obrigatório.', 'error');
      return;
    }
    const devData = { name };
    try {
  if (developerId) {
        // confirmar via GET antes de PUT
        const check = await fetch(`${API_BASE_URL}/developers/${developerId}`);
        if (check.ok) {
          const resp = await fetch(`${API_BASE_URL}/developers/${developerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(devData)
          });
          if (resp.ok) showMessage('Desenvolvedor atualizado com sucesso!', 'success');
          else throw new Error('Erro ao atualizar desenvolvedor');
        } else if (check.status === 404) {
          const create = confirm('Desenvolvedor não encontrado. Deseja criar com este ID?');
          if (create) {
            const payload = { id: parseInt(developerId, 10), ...devData };
            const r2 = await fetch(`${API_BASE_URL}/developers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (r2.ok) showMessage('Desenvolvedor criado com sucesso!', 'success');
            else showMessage('Falha ao criar desenvolvedor.', 'error');
          } else {
            showMessage('Operação cancelada. Desenvolvedor não existe.', 'warning');
          }
        } else {
          throw new Error('Erro ao verificar desenvolvedor');
        }
      } else if (searchedId) {
        const payload = { id: searchedId, ...devData };
        const resp = await fetch(`${API_BASE_URL}/developers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('Erro ao criar com ID');
        showMessage('Desenvolvedor criado com sucesso!', 'success');
      } else {
        // Criar
        await fetch(`${API_BASE_URL}/developers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(devData)
        });
        showMessage('Desenvolvedor criado com sucesso!', 'success');
    }
  hideForm();
      searchedId = null;
      await loadDevelopers();
    } catch (error) {
      showMessage('Erro ao salvar desenvolvedor.', 'error');
    }
  }

  // Editar e deletar
  async function editDeveloper(id) {
    showDeveloperForm(id);
  }

  async function deleteDeveloper(id) {
    if (!confirm('Tem certeza que deseja excluir este desenvolvedor?')) return;
    try {
      const check = await fetch(`${API_BASE_URL}/developers/${id}`);
      if (!check.ok) {
        if (check.status === 404) { showMessage('Desenvolvedor não encontrado.', 'error'); return; }
        throw new Error('Erro ao verificar desenvolvedor');
      }
      const del = await fetch(`${API_BASE_URL}/developers/${id}`, { method: 'DELETE' });
      if (!del.ok) { const t = await del.text(); throw new Error(t || 'Falha ao excluir'); }
      showMessage('Desenvolvedor excluído!', 'success');
      await loadDevelopers();
    } catch (error) {
      showMessage('Erro ao excluir desenvolvedor.', 'error');
    }
  }

  async function buscarPorId() {
    const id = searchIdInput.value.trim();
    if (!id) { showMessage('Digite um ID para buscar', 'warning'); return; }
    try {
      const r = await fetch(`${API_BASE_URL}/developers/${id}`);
      if (r.ok) {
        const dev = await r.json();
        // abre modal de edição para este desenvolvedor
        showDeveloperForm(dev.id);
        showMessage('Desenvolvedor encontrado! Clique em Alterar para editar ou Excluir para remover.', 'success');
        // preserve search value and lock input/button
        if (searchIdInput) searchIdInput.disabled = true;
        if (btnSearchId) btnSearchId.disabled = true;
      } else if (r.status === 404) {
        developersContainer.innerHTML = '';
        showDeveloperForm();
        document.getElementById('developer-id').value = id;
        searchedId = parseInt(id, 10);
        showMessage('Desenvolvedor não encontrado. Preencha o formulário e clique em Salvar para criar.', 'info');
        if (searchIdInput) searchIdInput.disabled = true;
        if (btnSearchId) btnSearchId.disabled = true;
      } else {
        throw new Error('Erro na busca');
      }
    } catch (err) {
      console.error(err);
      showMessage('Erro ao buscar desenvolvedor', 'error');
    }
  }

  function setFormDisabled(disabled) {
    const fields = ['developer-name'];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
  }

  function enableEditing() {
    setFormDisabled(false);
    if (saveBtn) saveBtn.style.display = 'inline-block';
    if (editBtn) editBtn.style.display = 'none';
  }

  function onCancel() {
    hideForm();
  }

  function onAfterDelete() {
    hideForm();
    searchedId = null;
  }

  // Mensagens
  function showMessage(text, type) {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    messageContainer.appendChild(message);
    setTimeout(() => {
      message.remove();
    }, 3000);
  }
});
