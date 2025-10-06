const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { gerarToken } = require('../utils/jwt');
const handleError = require('../middlewares/errorHandler');

async function register(req, res) {
  const { email, nickname, password, confirmPassword, adminCode } = req.body;
  if (!email || !nickname || !password || !confirmPassword)
    return res.status(400).json({ erro: 'Campos obrigatórios' });
  if (password !== confirmPassword)
    return res.status(400).json({ erro: 'Senhas diferentes' });

  try {
    const existing = await pool.query(
      `SELECT * FROM users WHERE email=$1 OR nickname=$2`,
      [email, nickname]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ erro: 'Email ou nickname já cadastrado' });

    const hashed = await bcrypt.hash(password, 10);
    const isAdmin = adminCode === 'CODIGO_SECRETO_ADMIN';
    const statusId = isAdmin ? 1 : 2;

    const result = await pool.query(
      `INSERT INTO users (email, nickname, password, user_status) 
       VALUES ($1,$2,$3,$4) RETURNING id,email,nickname`,
      [email, nickname, hashed, statusId]
    );

    const novoUsuario = result.rows[0];
    const token = gerarToken({ id: novoUsuario.id });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ authenticated: true, user: novoUsuario });
  } catch (err) {
    handleError(res, err, 'registrar usuário');
  }
}

async function login(req, res) {
  const { user, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email=$1 OR nickname=$1`,
      [user]
    );
    const userData = result.rows[0];
    if (!userData) return res.status(400).json({ erro: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, userData.password);
    if (!ok) return res.status(400).json({ erro: 'Credenciais inválidas' });

    const isAdmin = userData.user_status === 1;
    const token = gerarToken({ id: userData.id, email: userData.email, isAdmin });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({
      sucesso: true,
      mensagem: 'Login bem-sucedido',
      isAdmin,
      user: {
        id: userData.id,
        email: userData.email,
        nickname: userData.nickname,
        user_status: userData.user_status
      }
    });
  } catch (err) {
    handleError(res, err, 'fazer login');
  }
}

function logout(req, res) {
  res.clearCookie('token');
  res.json({ sucesso: true });
}

async function me(req, res) {
  try {
    const result = await pool.query(
      `SELECT id,email,nickname,user_status FROM users WHERE id=$1`,
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.json({ authenticated: false });
    res.json({
      authenticated: true,
      ...user,
      isAdmin: user.user_status === 1
    });
  } catch (err) {
    handleError(res, err, 'buscar usuário logado');
  }
}

async function checkPassword(req, res) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha não informada' });

    const result = await pool.query('SELECT password FROM users WHERE id=$1', [req.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ valid: false });
    return res.json({ valid: true });
  } catch (err) {
    handleError(res, err, 'verificar senha');
  }
}

module.exports = { register, login, logout, me, checkPassword };