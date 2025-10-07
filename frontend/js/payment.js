import { initUserCard } from './userCard.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btnCartao = document.getElementById('btn-cartao');
  const btnPix = document.getElementById('btn-pix');
  const secaoCartao = document.getElementById('secao-cartao');
  const secaoPix = document.getElementById('secao-pix');
  const btnCopiarPix = document.getElementById('btn-copiar-pix');
  const chavePix = document.getElementById('chave-pix');

  // --- Formatação dinâmica dos inputs de pagamento ---
  const cpfInput = document.getElementById('cpf');
  const cardInput = document.getElementById('numero-cartao');
  const validadeInput = document.getElementById('validade');
  const cvvInput = document.getElementById('cvv');

  function onlyDigits(s) { return s ? s.replace(/\D/g, '') : ''; }

  function formatCPF(value) {
    const d = onlyDigits(value).slice(0, 11);
    if (!d) return '';
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (m, a, b, c, e) => {
      return a + (b ? '.' + b : '') + (c ? '.' + c : '') + (e ? '-' + e : '');
    });
  }

  function formatCardNumber(value) {
    const d = onlyDigits(value).slice(0, 19); // suporta até 19 dígitos
    return d.replace(/(.{1,4})/g, '$1 ').trim();
  }

  function formatValidity(value) {
    const d = onlyDigits(value).slice(0, 4);
    if (d.length <= 2) return d;
    return d.slice(0,2) + '/' + d.slice(2);
  }

  function formatCVV(value) {
    return onlyDigits(value).slice(0,4);
  }

  function attachFormatter(el, formatter) {
    if (!el) return;
    el.addEventListener('input', (e) => {
      const start = el.selectionStart || el.value.length;
      const oldLen = el.value.length;
      el.value = formatter(el.value);
      // tenta colocar o cursor no final ou aproximadamente na mesma posição
      const newLen = el.value.length;
      const diff = newLen - oldLen;
      try { el.selectionStart = el.selectionEnd = Math.max(0, start + diff); } catch (err) { /* ignore */ }
    });
    // evita colar texto com letras
    el.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const text = (ev.clipboardData || window.clipboardData).getData('text');
      el.value = formatter(text);
      el.dispatchEvent(new Event('input'));
    });
  }

  attachFormatter(cpfInput, formatCPF);
  attachFormatter(cardInput, formatCardNumber);
  attachFormatter(validadeInput, formatValidity);
  attachFormatter(cvvInput, formatCVV);

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

  // Checa autenticação no carregamento da página e detecta admin
  let isAdminPage = false;
  try {
    const res = await fetch('http://127.0.0.1:3000/auth/me', { method: 'GET', credentials: 'include' });
    if (!res.ok) { window.location.href = '/frontend/login.html'; return; }
    const user = await res.json();
    if (!user || !user.authenticated) { window.location.href = '/frontend/login.html'; return; }
    isAdminPage = user.isAdmin === true;
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
    // já sabemos se é admin pela checagem inicial
    const isAdmin = isAdminPage;

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

    // Obtém usuário autenticado (mais confiável que depender apenas do localStorage)
    let userId = null;
    try {
      const r = await fetch('http://127.0.0.1:3000/auth/me', { method: 'GET', credentials: 'include' });
      if (r.ok) {
        const u = await r.json();
        if (u && u.authenticated) userId = u.id;
      }
    } catch (err) {
      console.warn('Não foi possível obter usuário via /auth/me:', err);
    }

    // Pega todos os itens do carrinho e adiciona à biblioteca
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length > 0) {
      // tenta adicionar cada jogo; é tolerante a erros individuais
      for (const item of cart) {
        const gid = item && (item.id || item.gameId) ? (item.id || item.gameId) : null;
        if (!gid) continue;
        try {
          // se não temos userId, tenta a partir do localStorage como fallback
          const uid = userId || localStorage.getItem('userId');
          if (!uid) { console.error('userId não disponível para adicionar na biblioteca'); break; }
          await adicionarJogoNaBiblioteca(uid, gid);
        } catch (err) {
          console.error('Erro ao adicionar jogo na biblioteca durante pagamento:', err);
        }
      }
    }

    alert('Pagamento aprovado com sucesso!');
    localStorage.removeItem('cart');
    localStorage.removeItem('totalCompra');
    mostrarConfirmacaoCompra();
    window.location.href = '/index.html';
  });

  // Inicializa o card de usuário compartilhado (logout, delete, abrir/fechar)
  initUserCard();

  function mostrarConfirmacaoCompra() { const modal = document.getElementById('confirmationModal'); if (modal) modal.style.display = 'flex'; }
  document.getElementById('closeModal')?.addEventListener('click', () => { const modal = document.getElementById('confirmationModal'); if (modal) modal.style.display = 'none'; });

  async function adicionarJogoNaBiblioteca(userId, gameId) { try { await fetch('http://127.0.0.1:3000/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ userId, gameId }) }); } catch (err) { console.error('Erro ao adicionar na biblioteca:', err); } }

  // Finalizar pagamento (botão genérico caso exista em outras telas)
  async function finalizarPagamento() {
    // Obtém usuário autenticado
    let userId = null;
    try {
      const r = await fetch('http://127.0.0.1:3000/auth/me', { method: 'GET', credentials: 'include' });
      if (r.ok) { const u = await r.json(); if (u && u.authenticated) userId = u.id; }
    } catch (err) { console.warn('Erro ao obter /auth/me:', err); }

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (!userId) userId = localStorage.getItem('userId');
    if (!userId) { alert('Usuário não identificado. Faça login e tente novamente.'); return; }

    if (cart.length === 0) { mostrarConfirmacaoCompra(); return; }

    for (const item of cart) {
      const gid = item && (item.id || item.gameId) ? (item.id || item.gameId) : null;
      if (!gid) continue;
      try { await adicionarJogoNaBiblioteca(userId, gid); } catch (err) { console.error('Erro ao adicionar na biblioteca:', err); }
    }
    localStorage.removeItem('cart');
    localStorage.removeItem('totalCompra');
    mostrarConfirmacaoCompra();
  }

  // Se o usuário for admin, mostra botão de Finalizar Compra (pula validações)
  const btnFinalizar = document.getElementById('btnFinalizarCompra');
  if (btnFinalizar) {
    if (isAdminPage) {
      btnFinalizar.style.display = 'block';
    }
    btnFinalizar.addEventListener('click', finalizarPagamento);
  }

  // --- Validações simples usadas na interface de pagamento ---
  function validarCPF(cpf) {
    if (!cpf || cpf.length !== 11) return false;
    // rejeita sequências repetidas
    if (/^(\d)\1+$/.test(cpf)) return false;
    // validação básica de CPF (cálculo dos dígitos)
    const nums = cpf.split('').map(n => parseInt(n, 10));
    for (let t = 9; t < 11; t++) {
      let d = 0;
      for (let i = 0; i < t; i++) d += nums[i] * ((t + 1) - i);
      d = ((10 * d) % 11) % 10;
      if (d !== nums[t]) return false;
    }
    return true;
  }

  function validarEndereco(endereco) {
    if (!endereco) return false;
    // exige pelo menos rua e número
    return /\S+\s+\d+/i.test(endereco.trim());
  }

  function validarCartao(numero) {
    if (!numero) return false;
    const s = numero.replace(/\s+/g, '');
    if (!/^[0-9]{13,19}$/.test(s)) return false;
    // Luhn
    let sum = 0; let alt = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let n = parseInt(s.charAt(i), 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return (sum % 10) === 0;
  }

  if (!localStorage.getItem('userId')) { window.location.href = '/frontend/login.html'; }
});