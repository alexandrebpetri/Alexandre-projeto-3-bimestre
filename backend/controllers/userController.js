const pool = require('../config/db');
const handleError = require('../middlewares/errorHandler');

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
    const result = await pool.query(`SELECT id,name FROM user_status`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar status');
  }
}

async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { user_status } = req.body;
  try {
    if (parseInt(id) === 1) {
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

module.exports = { listUsers, listUserStatus, updateUserStatus, deleteOwnAccount };