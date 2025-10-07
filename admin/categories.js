document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = 'http://127.0.0.1:3000';

  // DOM Elements
  const categoriesContainer = document.getElementById('categories-container');
  const categoryForm = document.getElementById('category-form-inline');
  const cancelBtn = document.getElementById('cancel-category-btn');
  const messageContainer = document.getElementById('message-container');
  // campo de busca global removido da UI; mantemos apenas busca por ID
  const categorySearchInput = document.getElementById('category-search');
  const searchIdInput = document.getElementById('search-id');
  const btnSearchId = document.getElementById('btn-search-id');
  const editBtn = document.getElementById('edit-category-btn');
  const saveBtn = document.getElementById('save-category-btn');

  let categories = [];
  let editingCategoryId = null;
  let searchedId = null; // id usado no fluxo buscar/incluir

  // Inicialização
  await loadCategories();

  setFormDisabled(true);

  // esconder painel esquerdo até o usuário buscar por ID
  const splitLeft = document.querySelector('.split-left');
  function collapseLeftPanel() { if (splitLeft) splitLeft.classList.add('collapsed-left'); }
  function expandLeftPanel() { if (splitLeft) splitLeft.classList.remove('collapsed-left'); }
  collapseLeftPanel();

  // Event Listeners — botão 'Adicionar' e buscas globais foram removidos da interface
  if (btnSearchId) btnSearchId.addEventListener('click', buscarPorId);
  cancelBtn && cancelBtn.addEventListener('click', () => onCancel());
  editBtn && editBtn.addEventListener('click', () => enableEditing());
  saveBtn && saveBtn.addEventListener('click', () => categoryForm.requestSubmit());
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
      onAfterDelete();
      await loadCategories();
    } catch (err) {
      console.error(err);
      showMessage('Falha ao excluir categoria.', 'error');
    }
  });
  categoryForm && categoryForm.addEventListener('submit', handleFormSubmit);

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

  // Form inline
  function showCategoryForm(categoryId = null) {
    const panelTitle = document.getElementById('panel-title');
    categoryForm.reset();
    editingCategoryId = null;
    document.getElementById('category-id').value = '';
    const deleteCategoryBtn = document.getElementById('delete-category-btn');
    if (categoryId) {
      const cat = categories.find(c => c.id == categoryId);
      if (cat) {
        document.getElementById('category-id').value = cat.id;
        document.getElementById('category-name').value = cat.name;
        panelTitle.textContent = 'Editar Categoria';
        editingCategoryId = cat.id;
        if (deleteCategoryBtn) deleteCategoryBtn.style.display = 'inline-block';
        if (editBtn) editBtn.style.display = 'inline-block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.style.display = 'none';
        setFormDisabled(true);
      }
    } else {
      panelTitle.textContent = 'Adicionar Nova Categoria';
      if (deleteCategoryBtn) deleteCategoryBtn.style.display = 'none';
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
    // preserve search and id values
    const searchInput = document.getElementById('search-id');
    const searchVal = searchInput ? searchInput.value : '';
    const hiddenId = document.getElementById('category-id');
    const hiddenVal = hiddenId ? hiddenId.value : '';
    categoryForm.reset();
    if (searchInput) searchInput.value = searchVal;
    if (hiddenId) hiddenId.value = hiddenVal;
    editingCategoryId = null;
    const deleteCategoryBtn = document.getElementById('delete-category-btn');
    if (deleteCategoryBtn) deleteCategoryBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    if (panelTitle) panelTitle.textContent = 'Categoria';
    setFormDisabled(true);
    // colapsar o painel esquerdo novamente (mantém o campo de busca visível)
    collapseLeftPanel();
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
  hideForm();
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
            showMessage('Categoria encontrada! Clique em Alterar para editar ou Excluir para remover.', 'success');
          } else if (r.status === 404) {
          // abrir modal para criar com ID
          categoriesContainer.innerHTML = '';
          showCategoryForm();
          document.getElementById('category-id').value = id;
          searchedId = parseInt(id, 10);
          showMessage('Categoria não encontrada. Preencha o formulário e clique em Salvar para criar.', 'info');
      } else {
        throw new Error('Erro na busca');
      }
    } catch (err) {
      console.error(err);
      showMessage('Erro ao buscar categoria', 'error');
    }
  }

  function setFormDisabled(disabled) {
    const fields = ['category-name'];
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

  // enableActions removed: tabela não possui botões de ação
});
// CRUD de Categorias
// Estrutura e funções serão implementadas após a criação do HTML
