document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = 'http://127.0.0.1:3000';

  // DOM Elements
  const gamesContainer = document.getElementById('games-container');
  const gameForm = document.getElementById('game-form');
  const modal = document.getElementById('game-modal');
  const closeModal = document.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-game-btn');
  const addGameBtn = document.getElementById('add-btn');
  const messageContainer = document.getElementById('message-container');
  const imagePreview = document.getElementById('image-preview');
  const removeImageBtn = document.getElementById('remove-image-btn');
  const gameImageInput = document.getElementById('game-image');
  const gameSearchInput = document.getElementById('game-search');
  const categoryFilter = document.getElementById('category-filter');
  const developerFilter = document.getElementById('developer-filter');
  const developerSelect = document.getElementById('game-developer');
  const categoriesContainer = document.getElementById('categories-container');

  let games = [];
  let developers = [];
  let categories = [];
  let currentImageBase64 = null;
  let currentImageId = null;
  let editingGameId = null;
  let searchedId = null;

  // Inicialização
  await loadDevelopers();
  await loadCategories();
  await loadGames();

  // Event Listeners (aplica apenas se os elementos existem)
  addGameBtn && addGameBtn.addEventListener('click', () => showGameForm());
  closeModal && closeModal.addEventListener('click', () => hideModal());
  cancelBtn && cancelBtn.addEventListener('click', () => hideModal());
  gameForm && gameForm.addEventListener('submit', handleFormSubmit);
  gameImageInput && gameImageInput.addEventListener('change', handleImageUpload);
  removeImageBtn && removeImageBtn.addEventListener('click', removeImage);
  gameSearchInput && gameSearchInput.addEventListener('input', filterGames);
  categoryFilter && categoryFilter.addEventListener('change', filterGames);
  developerFilter && developerFilter.addEventListener('change', filterGames);
  const btnSearchId = document.getElementById('btn-search-id');
  const searchIdInput = document.getElementById('search-id');
  if (btnSearchId) btnSearchId.addEventListener('click', buscarPorId);
  // Botão de exclusão dentro do modal
  const deleteGameBtn = document.getElementById('delete-game-btn');
  if (deleteGameBtn) {
    deleteGameBtn.addEventListener('click', async () => {
      const id = document.getElementById('game-id').value;
      if (!id) return showMessage('ID inválido para exclusão', 'error');
      if (!confirm('Tem certeza que deseja excluir este jogo?')) return;
      try {
        const res = await fetch(`${API_BASE_URL}/games/${id}`, { method: 'DELETE' });
        if (!res.ok) { const txt = await res.text(); throw new Error(txt || 'Erro ao excluir'); }
        showMessage('Jogo excluído com sucesso!', 'success');
        hideModal();
        await loadGames();
      } catch (err) {
        console.error(err);
        showMessage('Erro ao excluir jogo.', 'error');
      }
    });
  }

  // Carregar desenvolvedores e categorias
  async function loadDevelopers() {
    const res = await fetch(`${API_BASE_URL}/developers`);
    developers = await res.json();
    if (developerSelect) developerSelect.innerHTML = '<option value="">Selecione...</option>';
    if (developerFilter) developerFilter.innerHTML = '<option value="">Todos desenvolvedores</option>';
    developers.forEach(dev => {
      const opt = document.createElement('option');
      opt.value = dev.id;
      opt.textContent = dev.name;
      if (developerSelect) developerSelect.appendChild(opt);
      if (developerFilter) {
        const opt2 = opt.cloneNode(true);
        developerFilter.appendChild(opt2);
      }
    });
  }

  async function loadCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`);
    // atribui ao array global `categories` (não declarar const aqui)
    categories = await res.json();

    const container = document.getElementById('categories-container');
    if (container) container.innerHTML = '';

  // Preenche também o select de filtro de categorias (se existir)
  if (categoryFilter) categoryFilter.innerHTML = '<option value="">Todas categorias</option>';

    categories.forEach(cat => {
      // adiciona opção no filtro
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
  if (categoryFilter) categoryFilter.appendChild(opt);

      const div = document.createElement('div');
      div.classList.add('category-item');
      div.innerHTML = `
        <input type="checkbox" id="cat-${cat.id}" name="categories" value="${cat.id}">
        <label for="cat-${cat.id}">${cat.name}</label>
      `;
      if (container) container.appendChild(div);
    });
}


  // Carregar jogos
  async function loadGames() {
    const res = await fetch(`${API_BASE_URL}/games`);
    games = await res.json();
    if (gamesContainer) renderGames(games);
  }

  // Renderizar jogos em cards
  function renderGames(gamesToRender) {
    if (!gamesContainer) return;
    gamesContainer.innerHTML = '';
    if (!Array.isArray(gamesToRender) || gamesToRender.length === 0) {
      gamesContainer.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#bdb76b;padding:18px">Nenhum jogo encontrado.</td></tr>';
      return;
    }
    gamesToRender.forEach(game => {
      const devName = game.developer?.name || 'Desconhecido';
      const catNames = Array.isArray(game.categories)
        ? game.categories.map(cat => (typeof cat === 'string' ? cat : (cat && cat.name ? cat.name : ''))).filter(Boolean)
        : [];

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${game.id}</td>
        <td>${escapeHtml(game.name)}</td>
        <td>${game.price ? `R$ ${parseFloat(game.price).toFixed(2)}` : 'Grátis'}</td>
        <td>${escapeHtml(devName)}</td>
        <td>${catNames.map(c=>`<span class="category-tag">${escapeHtml(c)}</span>`).join(' ')}</td>
      `;
      gamesContainer.appendChild(tr);
    });
    // Ações removidas (não há botões na tabela)
  }

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Filtro de busca e selects
  function filterGames() {
  const searchTerm = (gameSearchInput && gameSearchInput.value) ? gameSearchInput.value.toLowerCase() : '';
  const selectedCategory = (categoryFilter && categoryFilter.value) ? parseInt(categoryFilter.value) : null;
  const selectedDeveloper = (developerFilter && developerFilter.value) ? parseInt(developerFilter.value) : null;
    const filtered = games.filter(game => {
      const matchesSearch = game.name.toLowerCase().includes(searchTerm);
      const matchesCategory = selectedCategory
        ? (Array.isArray(game.categories) &&
            game.categories.some(cat =>
              (typeof cat === 'object' && cat.id === selectedCategory) ||
              (typeof cat === 'string' && categories.find(c => c.id === selectedCategory && c.name === cat))
            ))
        : true;
      const matchesDeveloper = selectedDeveloper
        ? (game.developer && game.developer.id === selectedDeveloper)
        : true;
      return matchesSearch && matchesCategory && matchesDeveloper;
    });
    renderGames(filtered);
  }

  // Modal
  function showGameForm(gameId = null) {
    const modalTitle = document.getElementById('modal-title');
    gameForm.reset();
    imagePreview.style.display = 'none';
    removeImageBtn.style.display = 'none';
    currentImageBase64 = null;
    editingGameId = null;
    // Desmarca categorias
    document.querySelectorAll('#categories-container input[type="checkbox"]').forEach(cb => cb.checked = false);

    if (gameId) {
      modalTitle.textContent = 'Editar Jogo';
      const game = games.find(g => g.id === gameId);
      if (game) {
        editingGameId = game.id;
        currentImageId = game.image_id || null;
        document.getElementById('game-id').value = game.id;
        document.getElementById('game-name').value = game.name;
        document.getElementById('game-description').value = game.description || '';
        document.getElementById('game-price').value = game.price || '';
        document.getElementById('game-release-date').value = game.release_date ? game.release_date.split('T')[0] : '';
        developerSelect.value = game.developer?.id || '';
        // Categorias (array de strings ou objetos)
        if (Array.isArray(game.categories) && game.categories.length > 0) {
          game.categories.forEach(cat => {
            let catId = typeof cat === 'object' ? cat.id : (categories.find(c => c.name === cat)?.id);
            if (catId) {
              const checkbox = document.getElementById(`cat-${catId}`);
              if (checkbox) checkbox.checked = true;
            }
          });
        }
        // Imagem base64 válida
        if (
          typeof game.image === 'string' &&
          game.image.startsWith('data:image') &&
          !/\d{1,3}(,\d{1,3})+/.test(game.image)
        ) {
          imagePreview.src = game.image;
          imagePreview.style.display = 'block';
          removeImageBtn.style.display = 'block';
          currentImageBase64 = game.image;
        }
        const deleteGameBtn = document.getElementById('delete-game-btn');
        if (deleteGameBtn) deleteGameBtn.style.display = 'inline-block';
      }
    } else {
      modalTitle.textContent = 'Adicionar Novo Jogo';
      currentImageId = null;
      const deleteGameBtn = document.getElementById('delete-game-btn');
      if (deleteGameBtn) deleteGameBtn.style.display = 'none';
    }
    modal.style.display = 'block';
  }

  function hideModal() {
    modal.style.display = 'none';
  }

  // Função para enviar imagem separadamente após criar/editar o jogo
  async function uploadImage(gameId, base64Image) {
    if (!base64Image) return;
    // Extrai o conteúdo base64 puro
    const matches = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return;
    const mimeType = matches[1];
    const base64Data = matches[2];

    // Converte base64 para Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Monta FormData
    const formData = new FormData();
    formData.append('image', blob, 'upload.jpg');

    // Faz upload (endpoint montado em /images)
    await fetch(`${API_BASE_URL}/images/upload/${gameId}`, {
      method: 'POST',
      body: formData
    });
  }

  // Formulário
async function handleFormSubmit(e) {
  e.preventDefault();

  try {
    // Pega os valores do form
    const name = document.querySelector('#game-name').value.trim();
    const price = parseFloat(document.querySelector('#game-price').value);
    const releaseDate = document.querySelector('#game-release-date').value;
    const developerId = document.querySelector('#game-developer').value;
    const description = document.querySelector('#game-description').value.trim();


    // Categorias selecionadas
    const categories = Array.from(document.querySelectorAll('input[name="categories"]:checked'))
      .map(c => c.value);

    // Monta objeto para salvar jogo
    const newGame = {
      name,
      price,
      release_date: releaseDate,
      developer_id: developerId,
      description,
      categories
    };

    // 1) Envia os dados do jogo (sem imagem ainda)
    let url = `${API_BASE_URL}/games`;
    let method = 'POST';

    if (editingGameId) {
      url = `${API_BASE_URL}/games/${editingGameId}`;
      method = 'PUT';
    } else if (searchedId) {
      // criar com id informado na busca
      newGame.id = searchedId;
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGame)
    });


    if (!res.ok) {
      if (method === 'PUT') {
        // antes de PUT, confirmamos via GET
        const check = await fetch(`${API_BASE_URL}/games/${editingGameId}`);
        if (!check.ok && check.status === 404) {
          const doCreate = confirm('Jogo não encontrado. Deseja criar com este ID?');
          if (doCreate) {
            newGame.id = editingGameId;
            const r2 = await fetch(`${API_BASE_URL}/games`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newGame)
            });
            if (!r2.ok) {
              const t2 = await r2.text();
              throw new Error(`Erro ao criar jogo: ${t2}`);
            }
            const savedGame2 = await r2.json();
            await uploadImage(savedGame2.id, currentImageBase64);
            alert('Jogo criado com sucesso!');
            location.reload();
            return;
          }
          throw new Error('Operação cancelada pelo usuário');
        }
      }

      const errText = await res.text();
      throw new Error(`Erro ao salvar jogo: ${errText}`);
    }

    const savedGame = await res.json();
    const gameId = savedGame.id; // agora vai vir certo


    // 2) Se tiver imagem, faz upload separado
    if (currentImageBase64) {
      try {
        await uploadImage(gameId, currentImageBase64); // usa a função que te passei antes
        console.log('Imagem enviada com sucesso!');
      } catch (err) {
        console.error('Erro ao enviar imagem:', err);
      }
    }

    alert('Jogo salvo com sucesso!');
    location.reload(); // recarrega a lista de jogos
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar jogo. Veja o console.');
  }
}

  async function buscarPorId() {
    const id = searchIdInput.value.trim();
    if (!id) { showMessage('Digite um ID para buscar', 'warning'); return; }
    try {
      const r = await fetch(`${API_BASE_URL}/games/${id}`);
      if (r.ok) {
        const game = await r.json();
        showGameForm(game.id);
        showMessage('Jogo encontrado!', 'success');
      } else if (r.status === 404) {
        showGameForm();
        document.getElementById('game-id').value = id;
        searchedId = parseInt(id, 10);
        showMessage('Jogo não encontrado. Pode incluir com este ID.', 'info');
      } else {
        throw new Error('Erro na busca');
      }
    } catch (err) {
      console.error(err);
      showMessage('Erro ao buscar jogo', 'error');
    }
  }

  // Imagem base64
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) {
      removeImage();
      return;
    }
    const reader = new FileReader();
    reader.onload = function(event) {
      imagePreview.src = event.target.result;
      imagePreview.style.display = 'block';
      removeImageBtn.style.display = 'block';
      currentImageBase64 = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function removeImage() {
    // Se a imagem j e1 existe no servidor, apaga-a tamb e9m no backend
    try {
      if (editingGameId && currentImageId) {
        await fetch(`${API_BASE_URL}/images/${currentImageId}`, { method: 'DELETE' });
        // atualiza games localmente: remove referencia image_id do jogo atual
        const g = games.find(x => x.id === editingGameId);
        if (g) {
          g.image_id = null;
          g.image = null;
        }
        currentImageId = null;
      }
    } catch (err) {
      console.error('Erro ao remover imagem do servidor:', err);
    }

    // Limpa preview localmente
    imagePreview.src = '';
    imagePreview.style.display = 'none';
    removeImageBtn.style.display = 'none';
    gameImageInput.value = '';
    currentImageBase64 = null;
  }

  // Editar e deletar
  async function editGame(id) {
    showGameForm(id);
  }

  async function deleteGame(id) {
    if (!confirm('Tem certeza que deseja excluir este jogo?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/games/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir jogo');
      }
      showMessage('Jogo excluído com sucesso!', 'success');
      await loadGames();
    } catch (error) {
      showMessage(`Erro ao excluir jogo: ${error.message}`, 'error');
      console.error(error);
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