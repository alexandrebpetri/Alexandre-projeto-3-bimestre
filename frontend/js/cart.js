import { seeGame } from "./main.js";

function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('cart-container');
    container.innerHTML = '';

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
    document.getElementById("end-btn").onclick = paymentAddress;
    localStorage.setItem("totalCompra", total); // valorTotal = número

}


function paymentAddress(e) {
    if (!isUserLoggedIn()) {
        if (e) e.preventDefault();
        showLoginPopup();
        return false;
    }
    window.location.href = "payment.html";
}

function removerItem(index) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

// Função para abrir o card ao clicar na foto do usuário
document.getElementById('user').onclick = async function() {
  const overlay = document.getElementById('user-card-overlay');
  overlay.style.display = 'flex';

  // Busca dados do usuário logado
  const res = await fetch('http://127.0.0.1:3000/auth/me', { credentials: 'include' });
  if (res.ok) {
    const user = await res.json();
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-nick').textContent = user.nickname;
  }
  // Reset campos
  document.getElementById('delete-confirm-fields').style.display = 'none';
  document.getElementById('delete-final-warning').style.display = 'none';
  document.getElementById('user-card-actions').style.display = 'block';
  document.getElementById('delete-password-error').textContent = '';
};

// Fechar o card
document.getElementById('close-user-card').onclick = function() {
  document.getElementById('user-card-overlay').style.display = 'none';
};

// Logout
document.getElementById('logout-btn').onclick = async function() {
  await fetch('http://127.0.0.1:3000/auth/logout', { method: 'POST', credentials: 'include' });
  alert('Adeus! E até logo. ;)');
  window.location.href = 'index.html';
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
  window.location.href = 'index.html';
};

// Botão "Não" para cancelar exclusão
document.getElementById('delete-final-no').onclick = function() {
  window.location.href = 'index.html';
};

// Função para verificar se o usuário está logado (exemplo usando localStorage)
async function isUserLoggedIn() {
  const res = await fetch('http://127.0.0.1:3000/auth/me', {
    method: 'GET',
    credentials: 'include'
  });
  if (!res.ok) return false;
  const user = await res.json();
  return user && user.authenticated;
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

document.addEventListener('DOMContentLoaded', function() {
    const finalizarBtn = document.getElementById('end-btn');
    if (finalizarBtn) {
        finalizarBtn.addEventListener('click', function(e) {
            if (!isUserLoggedIn()) {
                e.preventDefault();
                showLoginPopup();
                return false;
            }
            // Se estiver logado, segue o fluxo normal
        });
    }
});

window.addEventListener('DOMContentLoaded', loadCart);