document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = 'http://127.0.0.1:3000';

  // DOM Elements
  const categoriesContainer = document.getElementById('categories-container');
  const categoryForm = document.getElementById('category-form-inline');
  const cancelBtn = document.getElementById('cancel-category-btn');
  const messageContainer = document.getElementById('message-container');
  const categorySearchInput = document.getElementById('category-search');
  const searchIdInput = document.getElementById('search-id');
  const btnSearchId = document.getElementById('btn-search-id');
  const editBtn = document.getElementById('edit-category-btn');
  const saveBtn = document.getElementById('save-category-btn');

  let categories = [];
  let editingCategoryId = null;
  let searchedId = null;

  // Inicialização
  await loadCategories();
  setFormDisabled(true);

  // esconder painel esquerdo até o usuário buscar por ID
  const splitLeft = document.querySelector('.split-left');
  function collapseLeftPanel() { if (splitLeft) splitLeft.classList.add('collapsed-left'); }
  function expandLeftPanel() { if (splitLeft) splitLeft.classList.remove('collapsed-left'); }
  collapseLeftPanel();

  // Event listeners
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
      if (!res.ok) { const txt = await res.text(); throw new Error(txt || 'Erro ao excluir'); }
      showMessage('Categoria excluída!', 'success');
      onAfterDelete();
      await loadCategories();
    } catch (err) {
      console.error(err);
      showMessage('Falha ao excluir categoria.', 'error');
    }
  });

  categoryForm && categoryForm.addEventListener('submit', handleFormSubmit);

  async function loadCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`);
    categories = await res.json();
    renderCategories(categories);
  }

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
  }

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

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
    expandLeftPanel();
  }

  function hideForm() {
    const panelTitle = document.getElementById('panel-title');
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
    collapseLeftPanel();
    if (searchIdInput) searchIdInput.disabled = false;
    if (btnSearchId) btnSearchId.disabled = false;
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

  function onCancel() { hideForm(); }
  function onAfterDelete() { hideForm(); searchedId = null; }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const categoryId = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value.trim();
    if (!name) return showMessage('O nome é obrigatório.', 'error');
    const catData = { name };
    try {
      if (categoryId) {
        const check = await fetch(`${API_BASE_URL}/categories/${categoryId}`);
        if (check.ok) {
          const resp = await fetch(`${API_BASE_URL}/categories/${categoryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catData) });
          if (resp.ok) showMessage('Categoria atualizada com sucesso!', 'success');
          else throw new Error('Erro ao atualizar categoria');
        } else if (check.status === 404) {
          const create = confirm('Categoria não encontrada. Deseja criar com este ID?');
          if (create) {
            const payload = { id: parseInt(categoryId, 10), ...catData };
            const r2 = await fetch(`${API_BASE_URL}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (r2.ok) showMessage('Categoria criada com sucesso!', 'success');
            else showMessage('Falha ao criar categoria.', 'error');
          } else {
            showMessage('Operação cancelada. Categoria não existe.', 'warning');
          }
        } else {
          throw new Error('Erro ao verificar categoria');
        }
      } else if (searchedId) {
        const payload = { id: searchedId, ...catData };
        const resp = await fetch(`${API_BASE_URL}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error('Erro ao criar com ID');
        showMessage('Categoria criada com sucesso!', 'success');
      } else {
        const r = await fetch(`${API_BASE_URL}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catData) });
        if (!r.ok) throw new Error('Erro ao criar categoria');
        showMessage('Categoria criada com sucesso!', 'success');
      }
      hideForm(); searchedId = null; await loadCategories();
    } catch (error) { console.error(error); showMessage('Erro ao salvar categoria.', 'error'); }
  }

  // Buscar por ID
  async function buscarPorId() {
    const id = searchIdInput.value.trim();
    if (!id) { showMessage('Digite um ID para buscar', 'warning'); return; }
    try {
      const r = await fetch(`${API_BASE_URL}/categories/${id}`);
      if (r.ok) {
        const cat = await r.json();
        const sv = searchIdInput ? searchIdInput.value : '';
        showCategoryForm(cat.id);
        if (searchIdInput) searchIdInput.value = sv;
        showMessage('Categoria encontrada! Clique em Alterar para editar ou Excluir para remover.', 'success');
        if (searchIdInput) searchIdInput.disabled = true;
        if (btnSearchId) btnSearchId.disabled = true;
      } else if (r.status === 404) {
        categoriesContainer.innerHTML = '';
        const sv2 = searchIdInput ? searchIdInput.value : '';
        showCategoryForm();
        if (searchIdInput) searchIdInput.value = sv2;
        document.getElementById('category-id').value = id;
        searchedId = parseInt(id, 10);
        showMessage('Categoria não encontrada. Preencha o formulário e clique em Salvar para criar.', 'info');
        if (searchIdInput) searchIdInput.disabled = true;
        if (btnSearchId) btnSearchId.disabled = true;
      } else { throw new Error('Erro na busca'); }
    } catch (err) { console.error(err); showMessage('Erro ao buscar categoria', 'error'); }
  }

  function showMessage(text, type = 'success') {
    // dedupe: não mostrar mensagem idêntica já presente
    const existing = Array.from(messageContainer.children).find(el => el.textContent === text && el.classList.contains(type === 'error' ? 'error' : 'success'));
    if (existing) return;
    const message = document.createElement('div');
    message.className = `message ${type === 'error' ? 'error' : 'success'}`;
    message.textContent = text;
    messageContainer.appendChild(message);
    setTimeout(() => message.remove(), 3000);
  }

});
