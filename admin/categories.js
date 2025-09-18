document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = 'http://127.0.0.1:3000';

  // DOM Elements
  const categoriesContainer = document.getElementById('categories-container');
  const categoryForm = document.getElementById('category-form');
  const modal = document.getElementById('category-modal');
  const closeModal = document.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-category-btn');
  const addCategoryBtn = document.getElementById('add-btn');
  const messageContainer = document.getElementById('message-container');
  const categorySearchInput = document.getElementById('category-search');

  let categories = [];
  let editingCategoryId = null;

  // Inicialização
  await loadCategories();

  // Event Listeners
  addCategoryBtn.addEventListener('click', () => showCategoryForm());
  closeModal.addEventListener('click', () => hideModal());
  cancelBtn && cancelBtn.addEventListener('click', () => hideModal());
  categoryForm.addEventListener('submit', handleFormSubmit);
  categorySearchInput.addEventListener('input', filterCategories);

  // Carregar categorias
  async function loadCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`);
    categories = await res.json();
    renderCategories(categories);
  }

  // Renderizar categorias em cards
  function renderCategories(catsToRender) {
    categoriesContainer.innerHTML = '';
    if (catsToRender.length === 0) {
      categoriesContainer.innerHTML = '<div class="no-categories">Nenhuma categoria encontrada.</div>';
      return;
    }
    catsToRender.forEach(cat => {
      const catCard = document.createElement('div');
      catCard.className = 'category-card';
      catCard.innerHTML = `
        <div class="category-info">${cat.name}</div>
        <div class="card-actions">
          <button class="edit-btn" title="Editar" data-id="${cat.id}">
            <img src="../../assets/edit-icon.png" alt="Editar" class="icon-medium">
          </button>
          <button class="delete-btn" title="Excluir" data-id="${cat.id}">
            <img src="../../assets/delete-icon.png" alt="Excluir" class="icon-medium">
          </button>
        </div>
      `;
      categoriesContainer.appendChild(catCard);
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => editCategory(e.currentTarget.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => deleteCategory(e.currentTarget.dataset.id));
    });
  }

  // Filtro de busca
  function filterCategories() {
    const searchTerm = categorySearchInput.value.toLowerCase();
    const filtered = categories.filter(cat => cat.name.toLowerCase().includes(searchTerm));
    renderCategories(filtered);
  }

  // Modal
  function showCategoryForm(categoryId = null) {
    const modalTitle = document.getElementById('modal-title');
    categoryForm.reset();
    editingCategoryId = null;
    document.getElementById('category-id').value = '';
    if (categoryId) {
      const cat = categories.find(c => c.id == categoryId);
      if (cat) {
        document.getElementById('category-id').value = cat.id;
        document.getElementById('category-name').value = cat.name;
        modalTitle.textContent = 'Editar Categoria';
        editingCategoryId = cat.id;
      }
    } else {
      modalTitle.textContent = 'Adicionar Nova Categoria';
    }
    modal.style.display = 'block';
  }

  function hideModal() {
    modal.style.display = 'none';
  }

  // Formulário
  async function handleFormSubmit(e) {
    e.preventDefault();
    const categoryId = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value.trim();
    if (!name) {
      showMessage('O nome é obrigatório.', 'error');
      return;
    }
    const catData = { name };
    try {
      if (categoryId) {
        // Editar
        await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(catData)
        });
        showMessage('Categoria atualizada com sucesso!', 'success');
      } else {
        // Criar
        await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(catData)
        });
        showMessage('Categoria criada com sucesso!', 'success');
      }
      hideModal();
      await loadCategories();
    } catch (error) {
      showMessage('Erro ao salvar categoria.', 'error');
    }
  }

  // Editar e deletar
  async function editCategory(id) {
    showCategoryForm(id);
  }

  async function deleteCategory(id) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE' });
      showMessage('Categoria excluída!', 'success');
      await loadCategories();
    } catch (error) {
      showMessage('Erro ao excluir categoria.', 'error');
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
// CRUD de Categorias
// Estrutura e funções serão implementadas após a criação do HTML
