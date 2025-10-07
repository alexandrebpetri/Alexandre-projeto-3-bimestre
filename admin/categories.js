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
  // campo de busca global removido da UI; mantemos apenas busca por ID
  const categorySearchInput = document.getElementById('category-search');

  let categories = [];
  let editingCategoryId = null;
  let searchedId = null; // id usado no fluxo buscar/incluir

  // Inicialização
  await loadCategories();

  // Event Listeners — botão 'Adicionar' e buscas globais foram removidos da interface
  const btnSearchId = document.getElementById('btn-search-id');
  const searchIdInput = document.getElementById('search-id');
  if (btnSearchId) btnSearchId.addEventListener('click', buscarPorId);
  closeModal.addEventListener('click', () => hideModal());
  cancelBtn && cancelBtn.addEventListener('click', () => hideModal());
  const deleteCategoryBtn = document.getElementById('delete-category-btn');
  deleteCategoryBtn && deleteCategoryBtn.addEventListener('click', async () => {
    const id = document.getElementById('category-id').value;
    if (!id) return showMessage('ID inválido para exclusão', 'error');
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Erro ao excluir');
      }
      showMessage('Categoria excluída!', 'success');
      hideModal();
      await loadCategories();
    } catch (err) {
      console.error(err);
      showMessage('Falha ao excluir categoria.', 'error');
    }
  });
  categoryForm.addEventListener('submit', handleFormSubmit);

  // Carregar categorias
  async function loadCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`);
    categories = await res.json();
    renderCategories(categories);
  }

  // Renderizar categorias em cards
  function renderCategories(catsToRender) {
    categoriesContainer.innerHTML = '';
    if (!Array.isArray(catsToRender) || catsToRender.length === 0) {
      categoriesContainer.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#bdb76b;padding:18px">Nenhuma categoria encontrada.</td></tr>';
      return;
    }
    catsToRender.forEach(cat => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${cat.id}</td>
        <td>${escapeHtml(cat.name)}</td>
      `;
      categoriesContainer.appendChild(tr);
    });
    // Ações removidas (não há botões na tabela)
  }

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
    const deleteCategoryBtn = document.getElementById('delete-category-btn');
    if (categoryId) {
      const cat = categories.find(c => c.id == categoryId);
      if (cat) {
        document.getElementById('category-id').value = cat.id;
        document.getElementById('category-name').value = cat.name;
        modalTitle.textContent = 'Editar Categoria';
        editingCategoryId = cat.id;
        if (deleteCategoryBtn) deleteCategoryBtn.style.display = 'inline-block';
      }
    } else {
      modalTitle.textContent = 'Adicionar Nova Categoria';
      if (deleteCategoryBtn) deleteCategoryBtn.style.display = 'none';
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
        // Antes de tentar PUT, confirma que existe via GET
        const check = await fetch(`${API_BASE_URL}/categories/${categoryId}`);
        if (check.ok) {
          const resp = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(catData)
          });
          if (resp.ok) showMessage('Categoria atualizada com sucesso!', 'success');
          else throw new Error('Erro ao atualizar categoria');
        } else if (check.status === 404) {
          const create = confirm('Categoria não encontrada. Deseja criar com este ID?');
          if (create) {
            const payload = { id: parseInt(categoryId, 10), ...catData };
            const r2 = await fetch(`${API_BASE_URL}/categories`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (r2.ok) showMessage('Categoria criada com sucesso!', 'success');
            else showMessage('Falha ao criar categoria.', 'error');
          } else {
            showMessage('Operação cancelada. Categoria não existe.', 'warning');
          }
        } else {
          throw new Error('Erro ao verificar categoria');
        }
      } else if (searchedId) {
        // Se veio de uma busca por ID e não existe, criar com ID informado
        const payload = { id: searchedId, ...catData };
        const resp = await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error('Erro ao criar com ID');
        showMessage('Categoria criada com sucesso!', 'success');
      } else {
        // Criar normalmente
        await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(catData)
        });
        showMessage('Categoria criada com sucesso!', 'success');
      }
      hideModal();
      searchedId = null;
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
      // verifica existência antes
      const check = await fetch(`${API_BASE_URL}/categories/${id}`);
      if (!check.ok) {
        if (check.status === 404) {
          showMessage('Categoria não encontrada.', 'error');
          return;
        }
        throw new Error('Erro ao verificar categoria');
      }
      const del = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE' });
      if (!del.ok) {
        const txt = await del.text();
        throw new Error(txt || 'Falha ao excluir');
      }
      showMessage('Categoria excluída!', 'success');
      await loadCategories();
    } catch (error) {
      showMessage('Erro ao excluir categoria.', 'error');
    }
  }

  // Buscar por ID: se existir carrega o modal em modo editar; se não existir abre modal para incluir com id preenchido
  async function buscarPorId() {
    const id = searchIdInput.value.trim();
    if (!id) { showMessage('Digite um ID para buscar', 'warning'); return; }
    try {
      const r = await fetch(`${API_BASE_URL}/categories/${id}`);
      if (r.ok) {
            const cat = await r.json();
            // abre modal de edição com o item encontrado
            showCategoryForm(cat.id);
            showMessage('Categoria encontrada! Abra o formulário para editar.', 'success');
          } else if (r.status === 404) {
          // abrir modal para criar com ID
          categoriesContainer.innerHTML = '';
          showCategoryForm();
          document.getElementById('category-id').value = id;
          searchedId = parseInt(id, 10);
          showMessage('Categoria não encontrada. Pode incluir com este ID.', 'info');
      } else {
        throw new Error('Erro na busca');
      }
    } catch (err) {
      console.error(err);
      showMessage('Erro ao buscar categoria', 'error');
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

  // enableActions removed: tabela não possui botões de ação
});
// CRUD de Categorias
// Estrutura e funções serão implementadas após a criação do HTML
