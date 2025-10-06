import { loadGamesFromAPI, games } from "../controller/controller.js";
import { initUserCard } from './userCard.js';

function formatCategories(categories) {
  if (!categories || categories.length === 0) return 'Nenhuma';
  // Suporta array de objetos ou strings
  return categories.map(cat => typeof cat === 'string' ? cat : (cat && cat.name ? cat.name : '')).filter(Boolean).join(', ');
}

function formatDeveloper(developer) {
  if (!developer) return 'Desconhecido';
  if (typeof developer === 'string') return developer;
  return developer.name || 'Desconhecido';
}

function formatDate(dateStr) {
  if (!dateStr) return 'Data não informada';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Data inválida';
  return d.toLocaleDateString('pt-BR');
}

function loadDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = parseInt(urlParams.get('id'), 10);
  const gamesContainer = document.getElementById('gamesContainer');

  loadGamesFromAPI().then(() => {
    const game = games.find(j => j.id === id);
    if (game) {
      gamesContainer.innerHTML = `
        <div class="details-main">
          <div class="details-image">
            <img src="${game.image || 'assets/no-image.png'}" alt="${game.name}">
          </div>
          <div class="details-info">
            <h1>${game.name}</h1>
            <p class="descricao"><b>Descrição:</b> ${game.description || 'Sem descrição.'}</p>
            <p class="categoria"><b>Categorias:</b> ${formatCategories(game.categories || game.category)}</p>
            <p class="developer"><b>Desenvolvedor:</b> ${formatDeveloper(game.developer)}</p>
            <p class="release-date"><b>Lançamento:</b> ${formatDate(game.release_date)}</p>
            <p id="gamePrice"><b>Preço:</b> ${game.price === 0 ? 'Grátis' : 'R$ ' + (game.price ? Number(game.price).toFixed(2) : '0,00')}</p>
            <button id="addCart">Adicionar ao Carrinho</button>
          </div>
        </div>
      `;
      const CartButton = document.getElementById('addCart');
      CartButton.addEventListener('click', () => AddToCart(game));
    } else {
      gamesContainer.innerHTML = '<div class="not-found">Jogo não encontrado!</div>';
    }
  });
}

function AddToCart(game) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const gameExisting = cart.some(item => item.id === game.id);
  if (gameExisting) {
    showMessage("Este jogo já está no carrinho.");
    return;
  }
  cart.push(game);
  localStorage.setItem('cart', JSON.stringify(cart));
  showMessage("Jogo adicionado ao carrinho!");
}

function showMessage(text) {
  const div = document.createElement("div");
  div.className = "floating-message";
  div.innerText = text;
  document.body.appendChild(div);
  setTimeout(() => {
    div.remove();
  }, 2000);
}

// Função para abrir o card ao clicar na foto do usuário
// Inicializa o user card compartilhado
initUserCard();

// Mostrar campos para exclusão de conta
document.getElementById('delete-account-btn').onclick = function() {
  document.getElementById('user-card-actions').style.display = 'none';
  document.getElementById('delete-confirm-fields').style.display = 'block';
  document.getElementById('delete-final-warning').style.display = 'none';
  document.getElementById('delete-password').value = '';
  document.getElementById('delete-password-confirm').value = '';
  document.getElementById('delete-password-error').textContent = '';
};

// Checar senha antes de mostrar aviso final
document.getElementById('delete-check-btn').onclick = async function() {
  const senha = document.getElementById('delete-password').value;
  const senha2 = document.getElementById('delete-password-confirm').value;
  const erro = document.getElementById('delete-password-error');
  erro.textContent = '';

  if (!senha || !senha2) {
    erro.textContent = 'Preencha ambos os campos.';
    return;
  }
  if (senha !== senha2) {
    erro.textContent = 'As senhas não coincidem.';
    return;
  }

  // Verifica senha no backend
  const res = await fetch('http://127.0.0.1:3000/auth/check-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password: senha })
  });
  if (res.ok) {
    document.getElementById('delete-confirm-fields').style.display = 'none';
    document.getElementById('delete-final-warning').style.display = 'block';
  } else {
    erro.textContent = 'Senha incorreta.';
  }
};

// Botão "Sim" para excluir conta
document.getElementById('delete-final-yes').onclick = async function() {
  await fetch('http://127.0.0.1:3000/auth/delete-account', {
    method: 'DELETE',
    credentials: 'include'
  });
  alert('Conta excluída com sucesso!');
  window.location.href = '/../index.html';
};

// Botão "Não" para cancelar exclusão
document.getElementById('delete-final-no').onclick = function() {
  window.location.href = '/../index.html';
};

loadDetails();