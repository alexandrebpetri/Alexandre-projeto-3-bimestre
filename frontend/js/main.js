import { loadGamesFromAPI, games } from '../controller/controller.js';
import { getUserLibraryIds } from './libraryAPI.js';

function loadGames(list = games, ownedIds = new Set()) {
  const container = document.getElementById("lista-jogos");
  if (!container) return; // página não tem lista de jogos -> nada a renderizar
  container.innerHTML = ""; // Limpa a lista antes de renderizar

  for (let i = 0; i < list.length; i++) {
    const game = list[i];
    let priceDisplay = game.price === 0 ? "Grátis" : `R$ ${game.price.toFixed(2)}`;
    if (ownedIds.has(game.id)) priceDisplay = 'Adquirido';

    const card = document.createElement("div");
    card.className = "game-card";
    card.onclick = () => seeGame(game.id);
    card.innerHTML = `
      <img src="${game.image}" alt="${game.name}" />
      <h2>${game.name}</h2>
      <p>${priceDisplay}</p>
    `;
    container.appendChild(card);
  }
}

function searchGames(text) {
  const term = text.toLowerCase();
  const filtered = games.filter(game => game.name.toLowerCase().includes(term));
  loadGames(filtered);
}

export function seeGame(id) {
  // Navigate relatively so pages inside the `frontend/` folder (like Cart.html)
  // go to details.html in the same folder instead of 'frontend/frontend/...'
  window.location.href = `details.html?id=${id}`;
}

window.seeGame = seeGame;
window.searchGames = searchGames;

// Carrega os jogos da API e monta os cards
// Só registra o carregamento e renderização automática de jogos se a página
// contém o elemento onde os jogos devem ser listados (ex: index.html)
if (document.getElementById('lista-jogos')) {
  window.onload = async () => {
    await loadGamesFromAPI();
    const owned = await getUserLibraryIds();
    loadGames(games, owned);
  };
}

// Função para abrir o card ao clicar na foto do usuário (se o botão existir)
const userBtn = document.getElementById('user');
if (userBtn) {
  userBtn.onclick = async function() {
    const overlay = document.getElementById('user-card-overlay');
    if (overlay) overlay.style.display = 'flex';

    // Busca dados do usuário logado
    try {
      const res = await fetch('http://127.0.0.1:3000/auth/me', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.ok) {
        const user = await res.json();
        if (user && user.authenticated) {
          const ui = document.getElementById('user-info'); if (ui) ui.style.display = 'block';
          const ue = document.getElementById('user-email'); if (ue) ue.textContent = user.email || '';
          const un = document.getElementById('user-nick'); if (un) un.textContent = user.nickname || '';
          const actions = document.getElementById('user-card-actions'); if (actions) actions.style.display = 'block';
          renderUserCard(user); // Chama a função para renderizar o card do usuário
        } else {
          showNoUserLogged();
        }
      } else {
        showNoUserLogged();
      }
    } catch (err) {
      console.error('Erro ao buscar /auth/me:', err);
      showNoUserLogged();
    }

    // Reset campos
    const dcf = document.getElementById('delete-confirm-fields'); if (dcf) dcf.style.display = 'none';
    const dff = document.getElementById('delete-final-warning'); if (dff) dff.style.display = 'none';
    const dpe = document.getElementById('delete-password-error'); if (dpe) dpe.textContent = '';
  };
}

function renderUserCard(user) {
    const cardTitle = document.getElementById('card-title');
    const manageBtnContainer = document.getElementById('manage-btn-container');

    // Altera o título do card
    if (user.isAdmin === true) {
        cardTitle.textContent = 'Perfil Admin';
        // Adiciona botão de gerenciamento
        manageBtnContainer.innerHTML = `
            <button id="manage-admin-btn">Gerenciar a Brincadeira..</button>
        `;
        document.getElementById('manage-admin-btn').onclick = () => {
            window.location.href = '/admin/admin.html';
        };
    } else {
        cardTitle.textContent = 'Perfil';
        manageBtnContainer.innerHTML = '';
    }
}

function showNoUserLogged() {
  document.getElementById('user-info').style.display = 'none';
  document.getElementById('user-card-actions').style.display = 'none';
  document.getElementById('delete-confirm-fields').style.display = 'none';
  document.getElementById('delete-final-warning').style.display = 'none';

  const userCard = document.getElementById('user-card');
  // Remove elementos antigos se houver
  let noUserDiv = document.getElementById('no-user-div');
  if (noUserDiv) noUserDiv.remove();

  noUserDiv = document.createElement('div');
  noUserDiv.id = 'no-user-div';
  noUserDiv.style.marginTop = '30px';
  noUserDiv.innerHTML = `
    <p style="margin-bottom: 20px;">Nenhum usuário está logado.</p>
    <button id="login-btn">Login</button>
    <button id="signin-btn" style="margin-left:10px;">Criar nova conta</button>
  `;
  userCard.appendChild(noUserDiv);

  document.getElementById('login-btn').onclick = () => window.location.href = 'login.html';
  document.getElementById('signin-btn').onclick = () => window.location.href = 'register.html';
}

// Fechar o card
document.getElementById('close-user-card').onclick = function() {
  document.getElementById('user-card-overlay').style.display = 'none';
};

// Logout (corrigido para GET)
document.getElementById('logout-btn').onclick = async function() {
  try {
    await fetch('http://127.0.0.1:3000/auth/logout', { method: 'GET', credentials: 'include' });
  } catch (err) {
    console.error('Erro no logout:', err);
  }
  localStorage.clear();
  alert('Adeus! E até logo. ;)');
  window.location.href = '/../index.html';
};

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
