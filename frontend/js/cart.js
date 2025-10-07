import { seeGame } from "./main.js";
import { initUserCard } from './userCard.js';
import { getUserLibraryIds } from './libraryAPI.js';

async function loadCart() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  console.log('[cart] loadCart start, cart items:', cart.length);
  const container = document.getElementById('cart-container');
  container.innerHTML = '';

  // Remove do carrinho jogos que o usuário já possui na biblioteca
  try {
    const owned = await getUserLibraryIds();
    if (owned && owned.size > 0 && cart.length > 0) {
      const originalLen = cart.length;
      cart = cart.filter(item => !owned.has(item.id));
      if (cart.length !== originalLen) {
        localStorage.setItem('cart', JSON.stringify(cart));
      }
    }
  } catch (err) {
    console.error('Erro ao verificar biblioteca do usuário para filtrar o carrinho:', err);
  }

  let total = 0;

  if (cart.length === 0) {
    container.innerHTML = `<p class="empty">Seu carrinho está vazio.</p>`;
    return;
  }

    cart.forEach((game, index) => {
        const card = document.createElement('div');
        card.classList.add('cart-card');
        card.onclick = () => seeGame(game.id);

        card.innerHTML = `
            <img src="${game.image}" alt="${game.name}">
            <div class="cart-info">
                <h2>${game.name}</h2>
                <p>${game.description}</p>
                <p class="price">R$ ${game.price.toFixed(2)}</p>
                <button class="remove-btn" data-index="${index}">Remover</button>
            </div>
        `;

        container.appendChild(card);
        total += game.price;
    });

    const summary = document.createElement('div');
    summary.classList.add('summary');

    summary.innerHTML = `
        <h3>Total: R$ ${total.toFixed(2)}</h3>
    <button id="end-btn">Finalizar Pedido</button>
    `;

    container.appendChild(summary);

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            removerItem(parseInt(btn.dataset.index));
        });
    });

  // Adicione o evento aqui, pois o botão é criado dinamicamente
  const endBtn = document.getElementById("end-btn");
    if (endBtn) {
    endBtn.style.cursor = 'pointer';
    // Se o total for zero e existir pelo menos um item, o botão vira 'Adicionar à Biblioteca'
    if (total === 0 && cart.length > 0) {
      endBtn.textContent = 'Adicionar à Biblioteca';
      console.log('[cart] endBtn present - switching to Add to Library mode');
      endBtn.onclick = (e) => {
        e.preventDefault();
        console.log('[cart] endBtn clicked — opening free items modal');
        // abre modal listando itens grátis e aguarda confirmação
        const modal = document.getElementById('freeItemsModal');
        const listEl = document.getElementById('free-items-list');
        if (!modal) { console.error('[cart] modal element #freeItemsModal not found'); alert('Erro interno: modal não encontrado.'); return; }
        if (!listEl) { console.error('[cart] list element #free-items-list not found'); alert('Erro interno: list não encontrada.'); return; }
        listEl.innerHTML = '';
        for (const item of cart) {
          const li = document.createElement('li');
          li.textContent = item.name || ('Jogo ' + (item.id || ''));
          listEl.appendChild(li);
        }
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';

        // Handlers temporários para os botões do modal
        const closeBtn = document.getElementById('closeFreeModal');
        const cancelBtn = document.getElementById('cancel-add-free');
        const confirmBtn = document.getElementById('confirm-add-free');

        function cleanup() {
          modal.style.display = 'none';
          closeBtn?.removeEventListener('click', onCancel);
          cancelBtn?.removeEventListener('click', onCancel);
          confirmBtn?.removeEventListener('click', onConfirm);
        }

        async function onConfirm() {
          // verifica se está logado
          const logged = await isUserLoggedIn();
          if (!logged) { cleanup(); showLoginPopup(); return; }
          // obtém userId via /auth/me
          let userId = null;
          try {
            const r = await fetch('http://127.0.0.1:3000/auth/me', { method: 'GET', credentials: 'include' });
            if (r.ok) { const u = await r.json(); if (u && u.authenticated) userId = u.id; }
          } catch (err) { console.error('Erro ao obter usuário:', err); }
          if (!userId) userId = localStorage.getItem('userId');
          if (!userId) { cleanup(); showLoginPopup(); return; }

          confirmBtn.disabled = true;
          cancelBtn.disabled = true;

          const successes = [];
          const failures = [];
          for (const item of cart) {
            const gid = item && (item.id || item.gameId) ? (item.id || item.gameId) : null;
            if (!gid) continue;
            try {
              const res = await fetch('http://127.0.0.1:3000/api/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId, gameId: gid })
              });
              if (res.ok || res.status === 201 || res.status === 409) { successes.push(gid); }
              else { failures.push({ gid, status: res.status }); }
            } catch (err) { console.error('Erro ao adicionar na biblioteca:', err); failures.push({ gid, error: err.message }); }
          }

          // Limpa carrinho e atualiza UI
          localStorage.removeItem('cart');
          localStorage.removeItem('totalCompra');
          cleanup();
          if (successes.length > 0) alert('Itens adicionados à sua biblioteca!');
          else alert('Nenhum item foi adicionado. Verifique o console para mais detalhes.');
          loadCart();
          window.location.href = 'library.html';
        }

        function onCancel() { cleanup(); }

        closeBtn?.addEventListener('click', onCancel);
        cancelBtn?.addEventListener('click', onCancel);
        confirmBtn?.addEventListener('click', onConfirm);
      };
    } else {
      endBtn.onclick = paymentAddress;
      console.log('[cart] endBtn present - payment flow assigned');
    }
  }
    localStorage.setItem("totalCompra", total); // valorTotal = número

}


async function paymentAddress(e) {
  try {
    const logged = await isUserLoggedIn();
    if (!logged) {
      if (e) e.preventDefault();
      showLoginPopup();
      return false;
    }
    window.location.href = "payment.html";
  } catch (err) {
    // Se ocorrer erro na verificação (rede/CORS/servidor), mostramos o popup
    if (e) e.preventDefault();
    console.error('Erro ao checar autenticação:', err);
    showLoginPopup();
    return false;
  }
}

function removerItem(index) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

// Função para abrir o card ao clicar na foto do usuário
// Inicializa o user card compartilhado
initUserCard();

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
  window.location.href = '/index.html';
};

// Botão "Não" para cancelar exclusão
document.getElementById('delete-final-no').onclick = function() {
  window.location.href = '/index.html';
};

// Função para verificar se o usuário está logado (exemplo usando localStorage)
async function isUserLoggedIn() {
  try {
    const res = await fetch('http://127.0.0.1:3000/auth/me', {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) return false;
    const user = await res.json();
    return user && user.authenticated;
  } catch (err) {
    console.error('isUserLoggedIn fetch error:', err);
    return false;
  }
}

function showLoginPopup() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const popup = document.createElement('div');
    popup.style.background = '#222';
    popup.style.color = '#fff';
    popup.style.padding = '32px';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    popup.style.textAlign = 'center';
    popup.innerHTML = `
        <h2>Você precisa estar logado</h2>
        <p>Para finalizar a compra, faça login ou crie uma conta.</p>
        <div style="margin-top: 20px;">
            <button id="popup-login-btn" style="margin-right: 10px; background:#bdb76b; color:#222; padding:10px 20px; border:none; border-radius:5px;">Login</button>
            <button id="popup-signin-btn" style="background:#bdb76b; color:#222; padding:10px 20px; border:none; border-radius:5px;">Criar Conta</button>
        </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    document.getElementById('popup-login-btn').onclick = function() {
        window.location.href = 'login.html';
    };
    document.getElementById('popup-signin-btn').onclick = function() {
        window.location.href = 'register.html';
    };
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

// Nota: o botão 'end-btn' é atribuído dinamicamente em loadCart()
// e já recebe a função paymentAddress (assíncrona) como handler.

window.addEventListener('DOMContentLoaded', loadCart);