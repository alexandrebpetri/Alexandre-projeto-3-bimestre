// Renderiza os cards no mesmo estilo da página inicial (classe game-card)

import { initUserCard } from './userCard.js';

let libItems = []; // armazena itens carregados para filtragem

// Inicializa o card do usuário imediatamente para garantir que o
// handler esteja disponível mesmo antes de init() (evita comportamento
// onde o usuário clica antes da inicialização da página)
try { initUserCard(); } catch (err) { console.error('Não foi possível inicializar user card no topo:', err); }

async function getCurrentUser() {
  try {
    const res = await fetch('http://127.0.0.1:3000/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Erro ao obter usuário:', err);
    return null;
  }
}

async function fetchLibrary(userId) {
  try {
    const res = await fetch(`http://127.0.0.1:3000/api/library/${userId}`, { credentials: 'include' });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Erro ao carregar biblioteca:', err);
    return [];
  }
}

function createCard(item) {
  // Card no mesmo formato da index (classe game-card)
  const card = document.createElement('div');
  card.className = 'game-card';
  // Ao clicar no card, ir para a página de detalhes
  card.onclick = () => { window.location.href = `details.html?id=${item.id}`; };

  const imgSrc = item.image ? item.image : '../assets/no-image.png';
  card.innerHTML = `
    <img src="${imgSrc}" alt="${(item.name||'Jogo').replace(/"/g,'&quot;')}" />
    <h2>${item.name || 'Sem título'}</h2>
    <button class="play-btn"><span class="play-icon">▶</span>Jogar</button>
  `;

  // botão jogar exibe um alerta informativo (projeto escolar) ao invés de abrir detalhes
  const btn = card.querySelector('.play-btn');
  if (btn) btn.onclick = (e) => {
    e.stopPropagation();
    alert("Isso nâo é um jogo de verdade!!! Isso é só um projeto que eu fiz pra escola seu bocó!!! Sugiro que se quer jogar esse jogo em uma loja oficial, viu👀👀. E não trabalhamos com a politíca de reembolso, Seja mais esperto!!!");
  };

  return card;
}

async function removeFromLibrary(libraryId, userId, gameId) {
  try {
    if (libraryId) {
      await fetch(`http://127.0.0.1:3000/api/library/${libraryId}`, { method: 'DELETE', credentials: 'include' });
    } else {
      // fallback: delete by user/game
      await fetch(`http://127.0.0.1:3000/api/library/user/${userId}/game/${gameId}`, { method: 'DELETE', credentials: 'include' });
    }
  } catch (err) {
    console.error('Erro ao remover da biblioteca:', err);
  }
}

function checkEmpty() {
  const grid = document.getElementById('library-grid');
  if (!grid || grid.children.length === 0) {
    grid.innerHTML = '<div class="empty">Sua biblioteca está vazia. Adicione jogos a partir da loja.</div>';
  }
}

function renderList(list) {
  const grid = document.getElementById('library-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!list || list.length === 0) {
    grid.innerHTML = '<div class="empty">Sua biblioteca está vazia. Adicione jogos a partir da loja.</div>';
    return;
  }
  list.forEach(item => grid.appendChild(createCard(item)));
}

function searchGames(text) {
  const term = (text || '').toLowerCase();
  const filtered = libItems.filter(g => (g.name || '').toLowerCase().includes(term));
  renderList(filtered);
}

window.searchGames = searchGames;

async function init() {
  const user = await getCurrentUser();
  const grid = document.getElementById('library-grid');
  if (!grid) return;

  if (!user || !user.id) {
    // Se não estiver logado, abrir o card de usuário solicitando login/registro
    // Preferimos simular um clique no ícone do usuário para reaproveitar a lógica do userCard
    const userBtn = document.getElementById('user');
    if (userBtn) {
      try { userBtn.click(); } catch (err) { console.error('Erro ao abrir user card:', err); }
    } else {
      // fallback: mostra a mensagem na grid
      grid.innerHTML = '<div class="empty">Você precisa estar logado para ver sua biblioteca.</div>';
    }
    // Não renderiza a biblioteca até o usuário logar
    return;
  }

  const lib = await fetchLibrary(user.id);
  if (!lib || lib.length === 0) {
    grid.innerHTML = '<div class="empty">Sua biblioteca está vazia. Adicione jogos a partir da loja.</div>';
    return;
  }

  libItems = lib; // guarda para pesquisa
  renderList(libItems);

  // Conecta o campo de busca
  const searchInput = document.getElementById('search-game');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => searchGames(e.target.value));
  }

  // Inicializa o card de usuário (reaproveita lógica existente)
  try { initUserCard(); } catch (err) { console.error('Não foi possível inicializar user card:', err); }
}

init();
