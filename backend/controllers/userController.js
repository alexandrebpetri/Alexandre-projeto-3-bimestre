const pool = require('../config/db');
const handleError = require('../middlewares/errorHandler');
const bcrypt = require('bcrypt');

async function listUsers(req, res) {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.nickname, u.user_status, s.name as status_name
      FROM users u
      LEFT JOIN user_status s ON u.user_status = s.id
      ORDER BY u.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar usuários');
  }
}

async function listUserStatus(req, res) {
  try {
    console.log('DEBUG listUserStatus called; params=', req.params, 'path=', req.path);
    const result = await pool.query(`SELECT id,name FROM user_status`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar status');
  }
}

// Buscar usuário por id (apenas dados públicos)
async function getUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const result = await pool.query(`SELECT id,email,nickname,user_status FROM users WHERE id=$1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'obter usuário');
  }
}

// Criar usuário (aceita id opcional). Reaproveita regras de validação de /auth/register
async function createUser(req, res) {
  try {
    const { id, email, nickname, password, confirmPassword, adminCode } = req.body;

    if (!email || !nickname || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Campos obrigatórios: email, nickname, password, confirmPassword' });
    }
    if (password !== confirmPassword) return res.status(400).json({ error: 'Senhas diferentes' });

    // Verifica duplicatas por id
    if (id !== undefined && id !== null) {
      const found = await pool.query('SELECT id FROM users WHERE id=$1', [id]);
      if (found.rowCount > 0) return res.status(409).json({ error: 'Usuário com esse ID já existe' });
    }

    // Verifica email/nickname
    const existing = await pool.query(`SELECT id FROM users WHERE email=$1 OR nickname=$2`, [email, nickname]);
    if (existing.rowCount > 0) return res.status(400).json({ error: 'Email ou nickname já cadastrado' });

    const hashed = await bcrypt.hash(password, 10);
    const isAdmin = adminCode === 'CODIGO_SECRETO_ADMIN';
    const statusId = isAdmin ? 1 : 2;

    let result;
    if (id !== undefined && id !== null) {
      result = await pool.query(
        `INSERT INTO users (id, email, nickname, password, user_status) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,nickname,user_status`,
        [id, email, nickname, hashed, statusId]
      );
    } else {
      result = await pool.query(
        `INSERT INTO users (email, nickname, password, user_status) VALUES ($1,$2,$3,$4) RETURNING id,email,nickname,user_status`,
        [email, nickname, hashed, statusId]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'criar usuário');
  }
}

// Upsert via PUT /users/:id - atualiza se existir, senão cria com o id informado
async function upsertUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const { email, nickname, password, confirmPassword, user_status } = req.body;
    // busca por id primeiro
    const existing = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    if (existing.rowCount === 0) {
      // não criamos via PUT: retorna 404
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualização: atualiza campos fornecidos
    const updates = [];
    const params = [];
    let idx = 1;
    if (email) {
      updates.push(`email=$${idx++}`);
      params.push(email);
    }
    if (nickname) {
      updates.push(`nickname=$${idx++}`);
      params.push(nickname);
    }
    if (typeof user_status !== 'undefined') {
      updates.push(`user_status=$${idx++}`);
      params.push(user_status);
    }
    if (password) {
      if (!confirmPassword || password !== confirmPassword) return res.status(400).json({ error: 'Senhas diferentes' });
      const hashed = await bcrypt.hash(password, 10);
      updates.push(`password=$${idx++}`);
      params.push(hashed);
    }

    if (updates.length === 0) {
      // nada a atualizar
      const user = existing.rows[0];
      return res.json({ id: user.id, email: user.email, nickname: user.nickname, user_status: user.user_status });
    }

    // checar duplicidade de email/nickname se ambos foram passados
    if (email || nickname) {
      const dup = await pool.query('SELECT id FROM users WHERE (email=$1 OR nickname=$2) AND id<>$3', [email || '', nickname || '', id]);
      if (dup.rowCount > 0) return res.status(400).json({ error: 'Email ou nickname já cadastrado por outro usuário' });
    }

    params.push(id);
    const q = `UPDATE users SET ${updates.join(', ')} WHERE id=$${idx} RETURNING id,email,nickname,user_status`;
    const result = await pool.query(q, params);
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'upsert usuário');
  }
}

async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { user_status } = req.body;
  try {
    if (parseInt(id, 10) === 1) {
      return res.status(403).json({ error: 'O Admin_Supremo não pode ter o status alterado.' });
    }
    const result = await pool.query(
      `UPDATE users SET user_status=$1 WHERE id=$2 RETURNING id,email,nickname,user_status`,
      [user_status, id]
    );
    res.json({ message: 'Status atualizado!', user: result.rows[0] });
  } catch (err) {
    handleError(res, err, 'atualizar status usuário');
  }
}

// Deletar a própria conta (usuário autenticado)
async function deleteOwnAccount(req, res) {
  const userId = req.userId;
  try {
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (userId === 1) return res.status(403).json({ error: 'O Admin_Supremo não pode ser excluído.' });

    await pool.query('DELETE FROM users WHERE id=$1', [userId]);
    // limpa cookie de sessão
    res.clearCookie('token');
    return res.status(204).send();
  } catch (err) {
    handleError(res, err, 'deletar própria conta');
  }
}

module.exports = { listUsers, getUser, createUser, upsertUser, listUserStatus, updateUserStatus, deleteOwnAccount };