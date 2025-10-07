document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = 'http://127.0.0.1:3000';

  // DOM Elements
  const developersContainer = document.getElementById('developers-container');
  const developerForm = document.getElementById('developer-form');
  const modal = document.getElementById('developer-modal');
  const closeModal = document.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-developer-btn');
  const addDeveloperBtn = document.getElementById('add-btn');
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

  let developers = [];
  let editingDeveloperId = null;
  let searchedId = null;

  // Inicialização
  await loadDevelopers();

  // Event Listeners (UI simplified: no add/global search)
  closeModal.addEventListener('click', () => hideModal());
  cancelBtn && cancelBtn.addEventListener('click', () => hideModal());
  developerForm.addEventListener('submit', handleFormSubmit);
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
      hideModal();
      await loadDevelopers();
    } catch (err) {
      console.error(err);
      showMessage('Falha ao excluir desenvolvedor.', 'error');
    }
  });
  developerSearchInput && developerSearchInput.addEventListener('input', filterDevelopers);
  const btnSearchId = document.getElementById('btn-search-id');
  const searchIdInput = document.getElementById('search-id');
  if (btnSearchId) btnSearchId.addEventListener('click', buscarPorId);

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
    const modalTitle = document.getElementById('modal-title');
    developerForm.reset();
    editingDeveloperId = null;
    document.getElementById('developer-id').value = '';
    if (developerId) {
      const dev = developers.find(d => d.id == developerId);
      if (dev) {
        document.getElementById('developer-id').value = dev.id;
        document.getElementById('developer-name').value = dev.name;
        modalTitle.textContent = 'Editar Desenvolvedor';
        editingDeveloperId = dev.id;
        if (deleteDeveloperBtn) deleteDeveloperBtn.style.display = 'inline-block';
      }
    } else {
      modalTitle.textContent = 'Adicionar Novo Desenvolvedor';
      if (deleteDeveloperBtn) deleteDeveloperBtn.style.display = 'none';
    }
    modal.style.display = 'block';
  }

  function hideModal() {
    modal.style.display = 'none';
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
      hideModal();
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
        showMessage('Desenvolvedor encontrado! Abra o formulário para editar.', 'success');
      } else if (r.status === 404) {
        developersContainer.innerHTML = '';
        showDeveloperForm();
        document.getElementById('developer-id').value = id;
        searchedId = parseInt(id, 10);
        showMessage('Desenvolvedor não encontrado. Pode incluir com este ID.', 'info');
      } else {
        throw new Error('Erro na busca');
      }
    } catch (err) {
      console.error(err);
      showMessage('Erro ao buscar desenvolvedor', 'error');
    }
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
