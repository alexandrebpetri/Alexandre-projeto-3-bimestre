// Módulo compartilhado para o card de usuário usado em várias páginas
export function initUserCard() {
  // Função que abre o overlay e popula com dados (ou mostra opções de login)
  async function openUserCard() {
    const overlay = document.getElementById('user-card-overlay');
    if (overlay) overlay.style.display = 'flex';

    try {
      const res = await fetch('http://127.0.0.1:3000/auth/me', { method: 'GET', credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        if (user && user.authenticated) {
          const userInfo = document.getElementById('user-info'); if (userInfo) userInfo.style.display = 'block';
          const emailEl = document.getElementById('user-email'); if (emailEl) emailEl.textContent = user.email || '';
          const nickEl = document.getElementById('user-nick'); if (nickEl) nickEl.textContent = user.nickname || '';
          const actions = document.getElementById('user-card-actions'); if (actions) actions.style.display = 'block';
          renderUserCard(user);
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

    // Reset campos de exclusão
    const delConfirm = document.getElementById('delete-confirm-fields'); if (delConfirm) delConfirm.style.display = 'none';
    const delFinal = document.getElementById('delete-final-warning'); if (delFinal) delFinal.style.display = 'none';
    const delErr = document.getElementById('delete-password-error'); if (delErr) delErr.textContent = '';
  }

  // Handler para abrir o overlay do card — tenta bind direto ao botão, se existir
  const userBtn = document.getElementById('user');
  if (userBtn) {
    userBtn.onclick = openUserCard;
  } else {
    // Se o elemento ainda não existir, adiciona um listener delegado no documento
    if (!document._userCardDelegation) {
      document._userCardDelegation = true;
      document.addEventListener('click', function delegatedUserClick(e) {
        const target = e.target.closest && e.target.closest('#user');
        if (target) openUserCard();
      });
    }
  }

  // Fechar card
  const closeBtn = document.getElementById('close-user-card');
  if (closeBtn) closeBtn.onclick = () => { const o = document.getElementById('user-card-overlay'); if (o) o.style.display = 'none'; };

  // Logout consistente
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.onclick = async function() {
    try { await fetch('http://127.0.0.1:3000/auth/logout', { method: 'GET', credentials: 'include' }); } catch (err) { console.error('Erro no logout:', err); }
    localStorage.clear();
    alert('Adeus! E até logo. ;)');
    window.location.href = '/../index.html';
  };

  // Mostrar campos para exclusão de conta
  const delBtn = document.getElementById('delete-account-btn');
  if (delBtn) delBtn.onclick = function() {
    const actions = document.getElementById('user-card-actions'); if (actions) actions.style.display = 'none';
    const confirm = document.getElementById('delete-confirm-fields'); if (confirm) confirm.style.display = 'block';
    const final = document.getElementById('delete-final-warning'); if (final) final.style.display = 'none';
    const pw = document.getElementById('delete-password'); if (pw) pw.value = '';
    const pw2 = document.getElementById('delete-password-confirm'); if (pw2) pw2.value = '';
    const err = document.getElementById('delete-password-error'); if (err) err.textContent = '';
  };

  // Checar senha antes de mostrar aviso final
  const checkBtn = document.getElementById('delete-check-btn');
  if (checkBtn) checkBtn.onclick = async function() {
    const senhaEl = document.getElementById('delete-password'); const senha2El = document.getElementById('delete-password-confirm'); const erro = document.getElementById('delete-password-error'); if (erro) erro.textContent = '';
    const senha = senhaEl ? senhaEl.value : ''; const senha2 = senha2El ? senha2El.value : '';
    if (!senha || !senha2) { if (erro) erro.textContent = 'Preencha ambos os campos.'; return; }
    if (senha !== senha2) { if (erro) erro.textContent = 'As senhas não coincidem.'; return; }
    try {
      const r = await fetch('http://127.0.0.1:3000/auth/check-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ password: senha }) });
      if (r.ok) { const conf = document.getElementById('delete-confirm-fields'); if (conf) conf.style.display = 'none'; const fin = document.getElementById('delete-final-warning'); if (fin) fin.style.display = 'block'; }
      else { if (erro) erro.textContent = 'Senha incorreta.'; }
    } catch (err) { console.error('Erro ao checar senha:', err); if (erro) erro.textContent = 'Erro ao verificar senha.'; }
  };

  // Confirmar exclusão
  const finalYes = document.getElementById('delete-final-yes');
  if (finalYes) finalYes.onclick = async function() { try { await fetch('http://127.0.0.1:3000/auth/delete-account', { method: 'DELETE', credentials: 'include' }); } catch (err) { console.error('Erro ao deletar conta:', err); } alert('Conta excluída com sucesso!'); window.location.href = '/index.html'; };
  const finalNo = document.getElementById('delete-final-no');
  if (finalNo) finalNo.onclick = function() { window.location.href = '/../index.html'; };
}

export function renderUserCard(user) {
  const cardTitle = document.getElementById('card-title');
  const manageBtnContainer = document.getElementById('manage-btn-container');
  if (!cardTitle) return;
  if (user.isAdmin === true) {
    cardTitle.textContent = 'Perfil Admin';
    if (manageBtnContainer) {
      manageBtnContainer.innerHTML = `<button id="manage-admin-btn">Gerenciar a Brincadeira..</button>`;
      const btn = document.getElementById('manage-admin-btn'); if (btn) btn.onclick = () => { window.location.href = '/admin/admin.html'; };
    }
  } else {
    cardTitle.textContent = 'Perfil';
    if (manageBtnContainer) manageBtnContainer.innerHTML = '';
  }
}

export function showNoUserLogged() {
  const userInfo = document.getElementById('user-info'); if (userInfo) userInfo.style.display = 'none';
  const actions = document.getElementById('user-card-actions'); if (actions) actions.style.display = 'none';
  const confirm = document.getElementById('delete-confirm-fields'); if (confirm) confirm.style.display = 'none';
  const final = document.getElementById('delete-final-warning'); if (final) final.style.display = 'none';

  const userCard = document.getElementById('user-card'); if (!userCard) return;
  let noUserDiv = document.getElementById('no-user-div'); if (noUserDiv) noUserDiv.remove();

  noUserDiv = document.createElement('div');
  noUserDiv.id = 'no-user-div';
  noUserDiv.style.marginTop = '30px';
  noUserDiv.innerHTML = `
    <p style="margin-bottom: 20px;">Nenhum usuário está logado.</p>
    <button id="login-btn">Login</button>
    <button id="signin-btn" style="margin-left:10px;">Criar nova conta</button>
  `;
  userCard.appendChild(noUserDiv);

  const loginBtn = document.getElementById('login-btn'); if (loginBtn) loginBtn.onclick = () => window.location.href = 'login.html';
  const signinBtn = document.getElementById('signin-btn'); if (signinBtn) signinBtn.onclick = () => window.location.href = 'register.html';
}
