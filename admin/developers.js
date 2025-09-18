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
  const developerSearchInput = document.getElementById('developer-search');

  let developers = [];
  let editingDeveloperId = null;

  // Inicialização
  await loadDevelopers();

  // Event Listeners
  addDeveloperBtn.addEventListener('click', () => showDeveloperForm());
  closeModal.addEventListener('click', () => hideModal());
  cancelBtn && cancelBtn.addEventListener('click', () => hideModal());
  developerForm.addEventListener('submit', handleFormSubmit);
  developerSearchInput.addEventListener('input', filterDevelopers);

  // Carregar desenvolvedores
  async function loadDevelopers() {
    const res = await fetch(`${API_BASE_URL}/developers`);
    developers = await res.json();
    renderDevelopers(developers);
  }

  // Renderizar desenvolvedores em cards
  function renderDevelopers(devsToRender) {
    developersContainer.innerHTML = '';
    if (devsToRender.length === 0) {
      developersContainer.innerHTML = '<div class="no-developers">Nenhum desenvolvedor encontrado.</div>';
      return;
    }
    devsToRender.forEach(dev => {
      const devCard = document.createElement('div');
      devCard.className = 'developer-card';
      devCard.innerHTML = `
        <div class="developer-info">${dev.name}</div>
        <div class="card-actions">
          <button class="edit-btn" title="Editar" data-id="${dev.id}">
            <img src="../../assets/edit-icon.png" alt="Editar" class="icon-medium">
          </button>
          <button class="delete-btn" title="Excluir" data-id="${dev.id}">
            <img src="../../assets/delete-icon.png" alt="Excluir" class="icon-medium">
          </button>
        </div>
      `;
      developersContainer.appendChild(devCard);
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => editDeveloper(e.currentTarget.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => deleteDeveloper(e.currentTarget.dataset.id));
    });
  }

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
      }
    } else {
      modalTitle.textContent = 'Adicionar Novo Desenvolvedor';
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
        // Editar
        await fetch(`${API_BASE_URL}/developers/${developerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(devData)
        });
        showMessage('Desenvolvedor atualizado com sucesso!', 'success');
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
      await fetch(`${API_BASE_URL}/developers/${id}`, { method: 'DELETE' });
      showMessage('Desenvolvedor excluído!', 'success');
      await loadDevelopers();
    } catch (error) {
      showMessage('Erro ao excluir desenvolvedor.', 'error');
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
