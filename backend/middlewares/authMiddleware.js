const { verificarToken } = require('../utils/jwt');

function verificarUsuarioLogado(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ erro: 'Usuário não autenticado.' });

  try {
    const payload = verificarToken(token);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

module.exports = { verificarUsuarioLogado };
