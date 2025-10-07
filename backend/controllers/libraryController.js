const pool = require('../config/db');
const handleError = require('../middlewares/errorHandler');

// Contrato (entrada/saída):
// - POST /api/library  body: { userId, gameId }
//   - 201 + registro criado
//   - 400 quando faltar dados
//   - 409 quando já existir
// - GET /api/library/:userId
//   - 200 + array de jogos na biblioteca do usuário

async function addToLibrary(req, res) {
  let { userId, gameId } = req.body;

  // Normaliza e valida
  userId = userId ? parseInt(userId, 10) : null;
  gameId = gameId ? parseInt(gameId, 10) : null;

  if (!userId || !gameId || Number.isNaN(userId) || Number.isNaN(gameId)) {
    return res.status(400).json({ error: 'userId e gameId válidos são obrigatórios.' });
  }

  try {
    // Confirma existência do usuário e do jogo (para retornar erro mais claro)
    const userCheck = await pool.query('SELECT id FROM users WHERE id=$1', [userId]);
    if (userCheck.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const gameCheck = await pool.query('SELECT id FROM games WHERE id=$1', [gameId]);
    if (gameCheck.rowCount === 0) return res.status(404).json({ error: 'Jogo não encontrado.' });

    // Verifica duplicata
    const exists = await pool.query(
      'SELECT id FROM library WHERE user_id=$1 AND game_id=$2',
      [userId, gameId]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({ message: 'Jogo já presente na biblioteca.' });
    }

    // Insere na biblioteca
    const result = await pool.query(
      `INSERT INTO library (user_id, game_id) VALUES ($1,$2) RETURNING *`,
      [userId, gameId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Tratamento específico para violação de unique constraint (race condition)
    if (err && (err.code === '23505' || err.constraint === 'library_user_game_unique')) {
      return res.status(409).json({ message: 'Jogo já presente na biblioteca.' });
    }
    handleError(res, err, 'adicionar à biblioteca');
  }
}

async function listLibraryByUser(req, res) {
  const { userId } = req.params;
  const uid = parseInt(userId, 10);
  if (!uid || Number.isNaN(uid)) return res.status(400).json({ error: 'userId inválido.' });

  try {
    const result = await pool.query(
      `SELECT l.id as library_id, g.* , i.data as image_data
       FROM library l
       JOIN games g ON l.game_id = g.id
       LEFT JOIN image i ON g.image_id = i.id
       WHERE l.user_id = $1
       ORDER BY l.id ASC`,
      [uid]
    );

    const library = result.rows.map(g => ({
      libraryId: g.library_id,
      id: g.id,
      name: g.name,
      description: g.description,
      price: g.price,
      release_date: g.release_date,
      developer_id: g.developer_id,
      image: g.image_data ? `data:image/png;base64,${g.image_data.toString('base64')}` : null
    }));

    res.json(library);
  } catch (err) {
    handleError(res, err, 'listar biblioteca do usuário');
  }
}

// Remove por id da tabela library
async function deleteLibraryById(req, res) {
  const { id } = req.params;
  const lid = parseInt(id, 10);
  if (!lid || Number.isNaN(lid)) return res.status(400).json({ error: 'id inválido.' });

  try {
    const result = await pool.query('DELETE FROM library WHERE id=$1 RETURNING *', [lid]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro não encontrado.' });
    return res.status(200).json({ message: 'Removido com sucesso.' });
  } catch (err) {
    handleError(res, err, 'remover item da biblioteca');
  }
}

// Remove por userId e gameId
async function deleteLibraryByUserGame(req, res) {
  const { userId, gameId } = req.params;
  const uid = parseInt(userId, 10);
  const gid = parseInt(gameId, 10);
  if (!uid || !gid || Number.isNaN(uid) || Number.isNaN(gid)) return res.status(400).json({ error: 'userId e gameId válidos são obrigatórios.' });

  try {
    const result = await pool.query('DELETE FROM library WHERE user_id=$1 AND game_id=$2 RETURNING *', [uid, gid]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro não encontrado.' });
    return res.status(200).json({ message: 'Removido com sucesso.' });
  } catch (err) {
    handleError(res, err, 'remover item da biblioteca');
  }
}

module.exports = { addToLibrary, listLibraryByUser, deleteLibraryById, deleteLibraryByUserGame };
