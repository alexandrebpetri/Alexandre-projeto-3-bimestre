import { initUserCard } from './userCard.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btnCartao = document.getElementById('btn-cartao');
  const btnPix = document.getElementById('btn-pix');
  const secaoCartao = document.getElementById('secao-cartao');
  const secaoPix = document.getElementById('secao-pix');
  const btnCopiarPix = document.getElementById('btn-copiar-pix');
  const chavePix = document.getElementById('chave-pix');

  if (btnCartao) btnCartao.addEventListener('click', () => {
    btnCartao.classList.add('ativo');
    if (btnPix) btnPix.classList.remove('ativo');
    if (secaoCartao) secaoCartao.classList.remove('oculto');
    if (secaoPix) secaoPix.classList.add('oculto');
  });

  if (btnPix) btnPix.addEventListener('click', () => {
    btnPix.classList.add('ativo');
    if (btnCartao) btnCartao.classList.remove('ativo');
    if (secaoPix) secaoPix.classList.remove('oculto');
    if (secaoCartao) secaoCartao.classList.add('oculto');
  });

  if (btnCopiarPix) btnCopiarPix.addEventListener('click', () => {
    if (!chavePix) return;
    navigator.clipboard.writeText(chavePix.textContent)
      .then(() => alert('Chave PIX copiada com sucesso!'))
      .catch(() => alert('Erro ao copiar a chave PIX.'));
  });

  // Checa autenticação no carregamento da página
  try {
    const res = await fetch('http://127.0.0.1:3000/auth/me', { method: 'GET', credentials: 'include' });
    if (!res.ok) { window.location.href = '/frontend/login.html'; return; }
    const user = await res.json();
    if (!user || !user.authenticated) { window.location.href = '/frontend/login.html'; return; }
  } catch (err) {
    console.error('Erro ao verificar auth em payment:', err);
    window.location.href = '/frontend/login.html';
    return;
  }

  // Total
  const valorSpan = document.getElementById('valor-total');
  const valorTotal = parseFloat(localStorage.getItem('totalCompra')) || 0;
  if (valorSpan) valorSpan.textContent = `R$ ${valorTotal.toFixed(2)}`;

  // Pagar com cartão
  const btnPagar = document.getElementById('btn-pagar-cartao');
  if (btnPagar) btnPagar.addEventListener('click', async () => {
    let isAdmin = false;
    try {
      const res = await fetch('http://127.0.0.1:3000/auth/me', { credentials: 'include' });
      if (res.ok) { const user = await res.json(); isAdmin = user.isAdmin === true; }
    } catch (e) { }

    if (!isAdmin) {
      const cpfEl = document.getElementById('cpf');
      const enderecoEl = document.getElementById('endereco');
      const numeroEl = document.getElementById('numero-cartao');
      const cpf = cpfEl ? cpfEl.value.trim().replace(/\D/g, '') : '';
      const endereco = enderecoEl ? enderecoEl.value.trim() : '';
      const numeroCartao = numeroEl ? numeroEl.value.trim().replace(/\s/g, '') : '';

      if (!validarCPF(cpf)) { alert('CPF inválido.'); return; }
      if (!validarEndereco(endereco)) { alert('Endereço inválido. Informe rua e número.'); return; }
      if (!validarCartao(numeroCartao)) { alert('Número do cartão inválido.'); return; }
    }

    const userId = localStorage.getItem('userId');
    const gameId = localStorage.getItem('gameId');
    if (userId && gameId) await adicionarJogoNaBiblioteca(userId, gameId);

    alert('Pagamento aprovado com sucesso!');
    localStorage.removeItem('cart');
    mostrarConfirmacaoCompra();
    window.location.href = '/index.html';
  });

  // Inicializa o card de usuário compartilhado (logout, delete, abrir/fechar)
  initUserCard();

  function mostrarConfirmacaoCompra() { const modal = document.getElementById('confirmationModal'); if (modal) modal.style.display = 'flex'; }
  document.getElementById('closeModal')?.addEventListener('click', () => { const modal = document.getElementById('confirmationModal'); if (modal) modal.style.display = 'none'; });

  async function adicionarJogoNaBiblioteca(userId, gameId) { try { await fetch('http://127.0.0.1:3000/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ userId, gameId }) }); } catch (err) { console.error('Erro ao adicionar na biblioteca:', err); } }

  function finalizarPagamento() { const userId = localStorage.getItem('userId'); const gameId = localStorage.getItem('gameId'); if (userId && gameId) adicionarJogoNaBiblioteca(userId, gameId); mostrarConfirmacaoCompra(); }

  const btnFinalizar = document.getElementById('btnFinalizarCompra'); if (btnFinalizar) btnFinalizar.addEventListener('click', finalizarPagamento);

  if (!localStorage.getItem('userId')) { window.location.href = '/frontend/login.html'; }
});