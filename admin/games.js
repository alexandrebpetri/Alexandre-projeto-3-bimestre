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
  let editingGameId = null;

  // Inicialização
  await loadDevelopers();
  await loadCategories();
  await loadGames();

  // Event Listeners
  addGameBtn.addEventListener('click', () => showGameForm());
  closeModal.addEventListener('click', () => hideModal());
  cancelBtn && cancelBtn.addEventListener('click', () => hideModal());
  gameForm.addEventListener('submit', handleFormSubmit);
  gameImageInput && gameImageInput.addEventListener('change', handleImageUpload);
  removeImageBtn && removeImageBtn.addEventListener('click', removeImage);
  gameSearchInput.addEventListener('input', filterGames);
  categoryFilter.addEventListener('change', filterGames);
  developerFilter.addEventListener('change', filterGames);

  // Carregar desenvolvedores e categorias
  async function loadDevelopers() {
    const res = await fetch(`${API_BASE_URL}/developers`);
    developers = await res.json();
    developerSelect.innerHTML = '<option value="">Selecione...</option>';
    developerFilter.innerHTML = '<option value="">Todos desenvolvedores</option>';
    developers.forEach(dev => {
      const opt = document.createElement('option');
      opt.value = dev.id;
      opt.textContent = dev.name;
      developerSelect.appendChild(opt);
      const opt2 = opt.cloneNode(true);
      developerFilter.appendChild(opt2);
    });
  }

  async function loadCategories() {
    const res = await fetch(`${API_BASE_URL}/categories`);
    categories = await res.json();
    categoriesContainer.innerHTML = '';
    categoryFilter.innerHTML = '<option value="">Todas categorias</option>';
    categories.forEach(cat => {
      // Para o filtro
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      categoryFilter.appendChild(opt);

      // Para o form
      const div = document.createElement('div');
      div.className = 'checkbox-item';
      div.innerHTML = `
        <input type="checkbox" id="cat-${cat.id}" value="${cat.id}">
        <label for="cat-${cat.id}">${cat.name}</label>
      `;
      categoriesContainer.appendChild(div);
    });
  }

  // Carregar jogos
  async function loadGames() {
    const res = await fetch(`${API_BASE_URL}/games`);
    games = await res.json();
    renderGames(games);
  }

  // Renderizar jogos em cards
  function renderGames(gamesToRender) {
    gamesContainer.innerHTML = '';
    if (gamesToRender.length === 0) {
      gamesContainer.innerHTML = '<div class="no-games">Nenhum jogo encontrado.</div>';
      return;
    }
    gamesToRender.forEach(game => {
      const gameCard = document.createElement('div');
      gameCard.className = 'game-card';

      // Imagem base64 ou padrão
      let imageSrc = game.image ? game.image : '/../assets/no-image.png';

      // Desenvolvedor (objeto)
      const devName = game.developer?.name || 'Desconhecido';

      // Categorias (array de strings OU objetos)
      const catNames = Array.isArray(game.categories)
        ? game.categories.map(cat =>
            typeof cat === 'string'
              ? cat
              : (cat && cat.name ? cat.name : '')
          ).filter(Boolean)
        : [];

      gameCard.innerHTML = `
        <div class="game-card-image">
          <img src="${imageSrc}" alt="${game.name}" onerror="this.onerror=null;this.src='/../assets/no-image.png'">
        </div>
        <div class="game-card-info">
          <h3>${game.name}</h3>
          <p class="game-price">${game.price ? `R$ ${parseFloat(game.price).toFixed(2)}` : 'Grátis'}</p>
          <p class="game-developer">Desenvolvedor: ${devName}</p>
          <div class="game-categories">
            ${catNames.length > 0 ? catNames.map(n => `<span class="category-tag">${n}</span>`).join('') : '<span class="category-tag">Sem categoria</span>'}
          </div>
        </div>
        <div class="data-card-actions">
          <button class="edit-btn" data-id="${game.id}">
            <img src="/../assets/edit-icon.png" alt="Editar">
          </button>
          <button class="delete-btn" data-id="${game.id}">
            <img src="/../assets/delete-icon.png" alt="Excluir">
          </button>
        </div>
      `;
      gamesContainer.appendChild(gameCard);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editGame(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteGame(parseInt(btn.dataset.id)));
    });
  }

  // Filtro de busca e selects
  function filterGames() {
    const searchTerm = gameSearchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value ? parseInt(categoryFilter.value) : null;
    const selectedDeveloper = developerFilter.value ? parseInt(developerFilter.value) : null;
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
      }
    } else {
      modalTitle.textContent = 'Adicionar Novo Jogo';
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

    // Faz upload
    await fetch(`${API_BASE_URL}/upload/${gameId}`, {
      method: 'POST',
      body: formData
    });
  }

  // Formulário
  async function handleFormSubmit(e) {
    e.preventDefault();
    const gameId = document.getElementById('game-id').value;
    const name = document.getElementById('game-name').value;
    const description = document.getElementById('game-description').value;
    const price = document.getElementById('game-price').value;
    const releaseDate = document.getElementById('game-release-date').value;
    const developerId = developerSelect.value;
    // Categorias
    const selectedCategories = [];
    document.querySelectorAll('#categories-container input[type="checkbox"]:checked').forEach(cb => {
      const cat = categories.find(c => c.id == cb.value);
      if (cat) selectedCategories.push(cat);
    });

    // Validação de data (alerta para o usuário)
    let releaseDateToSend = null;
    if (releaseDate) {
      if (!isNaN(Date.parse(releaseDate))) {
        const year = new Date(releaseDate).getFullYear();
        if (year >= 1900 && year <= 2100) {
          releaseDateToSend = releaseDate;
        } else {
          showMessage('Ano da data de lançamento deve ser entre 1900 e 2100.', 'error');
          return;
        }
      } else {
        showMessage('Data de lançamento inválida.', 'error');
        return;
      }
    }

    // Validação e conversão do preço (aceita vírgula ou ponto)
    let priceValue = price ? price.replace(',', '.') : '';
    if (priceValue && isNaN(Number(priceValue))) {
      showMessage('Preço inválido. Use apenas números, ponto ou vírgula.', 'error');
      return;
    }

    if (!developerId) {
      showMessage('Selecione um desenvolvedor.', 'error');
      return;
    }
    if (selectedCategories.length === 0) {
      showMessage('Selecione pelo menos uma categoria.', 'error');
      return;
    }

    // O backend NÃO exige id no POST, apenas no PUT!
    const gameData = {
      name,
      description,
      price: priceValue ? parseFloat(priceValue) : 0,
      release_date: releaseDateToSend,
      developer_id: developerId ? parseInt(developerId) : null,
      categories: selectedCategories.map(cat => cat.id)
    };

    try {
      let response;
      let method = 'POST';
      let url = `${API_BASE_URL}/games`;
      if (gameId) {
        method = 'PUT';
        url = `${API_BASE_URL}/games/${gameId}`;
        gameData.id = parseInt(gameId); // Só envie id no PUT
      }
      response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ao ${gameId ? 'atualizar' : 'adicionar'} jogo`);
      }
      // Pega o id do jogo salvo/criado
      let savedGameId = gameId;
      if (!gameId) {
        const savedGame = await response.json();
        savedGameId = savedGame.id;
      }
      // Faz upload da imagem se houver
      if (currentImageBase64) {
        await uploadImage(savedGameId, currentImageBase64);
      }
      showMessage(`Jogo ${gameId ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
      await loadGames();
      hideModal();
    } catch (error) {
      showMessage(`Erro ao salvar jogo: ${error.message}`, 'error');
      console.error(error);
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

  function removeImage() {
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