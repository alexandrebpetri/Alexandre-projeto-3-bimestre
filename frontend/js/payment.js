document.addEventListener('DOMContentLoaded', async () => {
    const btnCartao = document.getElementById('btn-cartao');
    const btnPix = document.getElementById('btn-pix');
    const secaoCartao = document.getElementById('secao-cartao');
    const secaoPix = document.getElementById('secao-pix');
    const btnCopiarPix = document.getElementById('btn-copiar-pix');
    const chavePix = document.getElementById('chave-pix');
  
    btnCartao.addEventListener('click', () => {
      btnCartao.classList.add('ativo');
      btnPix.classList.remove('ativo');
      secaoCartao.classList.remove('oculto');
      secaoPix.classList.add('oculto');
    });
  
    btnPix.addEventListener('click', () => {
      btnPix.classList.add('ativo');
      btnCartao.classList.remove('ativo');
      secaoPix.classList.remove('oculto');
      secaoCartao.classList.add('oculto');
    });
  
    btnCopiarPix.addEventListener('click', () => {
      navigator.clipboard.writeText(chavePix.textContent)
        .then(() => alert('Chave PIX copiada com sucesso!'))
        .catch(err => alert('Erro ao copiar a chave PIX.'));
    });
  
    // Verificação de login usando o backend
    const res = await fetch('http://127.0.0.1:3000/auth/me', {
      method: 'GET',
      credentials: 'include'
    });
  
    if (!res.ok) {
      // Usuário não está logado, redireciona para login
      window.location.href = 'login.html';
      return;
    }
  
    const user = await res.json();
    if (!user || !user.authenticated) {
      window.location.href = 'login.html';
      return;
    }
  });
  
  const valorSpan = document.getElementById('valor-total');
  const valorTotal = parseFloat(localStorage.getItem('totalCompra')) || 0;
  valorSpan.textContent = `R$ ${valorTotal.toFixed(2)}`;
  
  
  document.getElementById("btn-pagar-cartao").addEventListener("click", async () => {
    // Busca status do usuário
    let isAdmin = false;
    try {
      const res = await fetch('http://127.0.0.1:3000/auth/me', { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        isAdmin = user.isAdmin === true;
      }
    } catch (e) {
      // Se não conseguir buscar, segue fluxo normal
    }
  
    // Se não for admin, faz validação dos campos
    if (!isAdmin) {
      const cpf = document.getElementById("cpf").value.trim().replace(/\D/g, '');
      const endereco = document.getElementById("endereco").value.trim();
      const numeroCartao = document.getElementById("numero-cartao").value.trim().replace(/\s/g, '');
  
      if (!validarCPF(cpf)) {
        alert("CPF inválido.");
        return;
      }
  
      if (!validarEndereco(endereco)) {
        alert("Endereço inválido. Informe rua e número.");
        return;
      }
  
      if (!validarCartao(numeroCartao)) {
        alert("Número do cartão inválido.");
        return;
      }
    }
  
    // Adiciona o jogo à biblioteca do usuário
    const userId = localStorage.getItem('userId');
    const gameId = localStorage.getItem('gameId');
    if (userId && gameId) {
      await adicionarJogoNaBiblioteca(userId, gameId);
    }
  
    alert("Pagamento aprovado com sucesso!");
    localStorage.removeItem("cart");
    mostrarConfirmacaoCompra();
    window.location.href = "index.html";
  });
  
  // ---- Validação real de CPF (algoritmo oficial) ----
  function validarCPF(cpf) {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
    let digito1 = 11 - (soma % 11);
    if (digito1 > 9) digito1 = 0;
    if (digito1 != Number(cpf[9])) return false;
  
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
    let digito2 = 11 - (soma % 11);
    if (digito2 > 9) digito2 = 0;
    return digito2 == Number(cpf[10]);
  }
  
  // ---- Endereço com rua e número (mínimo) ----
  function validarEndereco(endereco) {
    const partes = endereco.split(',');
    return partes.length >= 2 && partes[0].trim().length > 0 && partes[1].trim().length > 0;
  }
  
  // ---- Validação de Cartão (algoritmo de Luhn) ----
  function validarCartao(numero) {
    if (!/^\d{16}$/.test(numero)) return false;
    let soma = 0;
    let alternar = false;
  
    for (let i = numero.length - 1; i >= 0; i--) {
      let n = parseInt(numero[i]);
      if (alternar) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      soma += n;
      alternar = !alternar;
    }
  
    return soma % 10 === 0;
  }
  // Função para validar validade do cartão (MM/AA)
function validarValidade(validade) {
    const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!regex.test(validade)) return false;
  
    const [mes, ano] = validade.split("/");
    const dataValidade = new Date(`20${ano}-${mes}-01`);
    const dataAtual = new Date();
    return dataValidade >= dataAtual;
  }
  
  // Função para validar CVV (3 ou 4 dígitos)
  function validarCVV(cvv) {
    return /^\d{3,4}$/.test(cvv);
  }
  
  // Máscara de CPF
document.getElementById("cpf").addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d)/, "$1.$2");
    value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    e.target.value = value;
  });
  
  // Máscara para número do cartão
  document.getElementById("numero-cartao").addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, "$1 ");
    e.target.value = value.trim();
  });
  
  // Máscara de validade (MM/AA)
document.getElementById("validade").addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (value.length >= 3) {
      value = value.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    }
    e.target.value = value;
  });
  
  // Máscara de CVV (3 ou 4 dígitos)
  document.getElementById("cvv").addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 4);
    e.target.value = value;
  });
  
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
  await fetch('http://127.0.0.1:3000/auth/logout', { method: 'GET', credentials: 'include' });
  localStorage.clear(); // Limpa tudo!
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

function mostrarConfirmacaoCompra() {
  document.getElementById('confirmationModal').style.display = 'flex';
}

document.getElementById('closeModal').onclick = function() {
  document.getElementById('confirmationModal').style.display = 'none';
};

// Exemplo: Chame mostrarConfirmacaoCompra() após finalizar o pagamento
async function adicionarJogoNaBiblioteca(userId, gameId) {
  await fetch('http://127.0.0.1:3000/api/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Adicione esta linha!
    body: JSON.stringify({ userId, gameId })
  });
}

function finalizarPagamento() {
  // ...lógica de pagamento...

  // Exemplo: Pegue os IDs do usuário e do jogo (ajuste conforme seu fluxo)
  const userId = localStorage.getItem('userId'); // ou obtenha de outro modo
  const gameId = localStorage.getItem('gameId'); // ou obtenha de outro modo

  if (userId && gameId) {
    adicionarJogoNaBiblioteca(userId, gameId);
  }

  mostrarConfirmacaoCompra();
}

// Se já existe um botão de finalizar, adicione o evento:
const btnFinalizar = document.getElementById('btnFinalizarCompra');
if (btnFinalizar) {
  btnFinalizar.addEventListener('click', finalizarPagamento);
}

// Verifica se o usuário está logado antes de carregar a tela de pagamento
if (!localStorage.getItem('userId')) {
    window.location.href = 'login.html';
    // return; // Não precisa, pois o redirecionamento já interrompe o fluxo
}