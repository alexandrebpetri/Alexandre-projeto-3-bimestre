const pool = require('../config/db');
const handleError = require('../middlewares/errorHandler');

async function listGames(req, res) {
  try {
    const result = await pool.query(`
      SELECT g.*, d.name as developer_name, i.data as image_data
      FROM games g
      LEFT JOIN developer d ON g.developer_id = d.id
      LEFT JOIN image i ON g.image_id = i.id
      ORDER BY g.id ASC
    `);

    const games = await Promise.all(result.rows.map(async g => {
      const cats = await pool.query(`
        SELECT c.name 
        FROM game_category gc
        JOIN category c ON gc.category_id = c.id
        WHERE gc.game_id=$1
      `, [g.id]);

      return {
        ...g,
        developer: g.developer_id ? { id: g.developer_id, name: g.developer_name } : null,
        categories: cats.rows.map(c => c.name),
        image: g.image_data ? `data:image/png;base64,${g.image_data.toString('base64')}` : null
      };
    }));

    res.json(games);
  } catch (err) {
    handleError(res, err, 'listar jogos');
  }
}

async function getGame(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const result = await pool.query('SELECT * FROM games WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Jogo não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'obter jogo');
  }
}

// Criar novo jogo (aceita id opcional)
async function createGame(req, res) {
  try {
    const { id, name, description, price, release_date, developer_id, categories } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    if (id !== undefined && id !== null) {
      const exists = await pool.query('SELECT id FROM games WHERE id=$1', [id]);
      if (exists.rowCount > 0) return res.status(409).json({ error: 'Jogo com esse ID já existe' });
    }

    const result = await pool.query(
      `INSERT INTO games (id, name, description, price, release_date, developer_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, name, description, price, release_date, developer_id]
    );
    const game = result.rows[0];

    if (Array.isArray(categories) && categories.length > 0) {
      // verifica se as categorias existem antes de inserir
      for (const catId of categories) {
        const c = await pool.query('SELECT id FROM category WHERE id=$1', [catId]);
        if (c.rowCount === 0) continue; // ignora categorias inexistentes
        await pool.query('INSERT INTO game_category (game_id, category_id) VALUES ($1,$2)', [game.id, catId]);
      }
    }

    res.status(201).json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Atualizar jogo (upsert: se não existir, cria com o id informado)
async function updateGame(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, price, release_date, developer_id, categories } = req.body;

    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    // busca por id primeiro
    const existing = await pool.query('SELECT * FROM games WHERE id=$1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Jogo não encontrado' });

    const result = await pool.query(
      `UPDATE games SET name=$1, description=$2, price=$3, release_date=$4, developer_id=$5 WHERE id=$6 RETURNING *`,
      [name, description, price, release_date, developer_id, id]
    );
    const game = result.rows[0];

    if (typeof categories !== 'undefined') {
      await pool.query('DELETE FROM game_category WHERE game_id=$1', [id]);
      if (Array.isArray(categories) && categories.length > 0) {
        for (const catId of categories) {
          const c = await pool.query('SELECT id FROM category WHERE id=$1', [catId]);
          if (c.rowCount === 0) continue;
          await pool.query('INSERT INTO game_category (game_id, category_id) VALUES ($1, $2)', [id, catId]);
        }
      }
    }

    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function deleteGame(req, res) {
  try {
    const { id } = req.params;
    // verifica existência
    const found = await pool.query('SELECT id FROM games WHERE id=$1', [id]);
    if (found.rowCount === 0) return res.status(404).json({ error: 'Jogo não encontrado' });

    await pool.query('DELETE FROM game_category WHERE game_id=$1', [id]);
    await pool.query('DELETE FROM games WHERE id=$1', [id]);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, 'deletar jogo');
  }
}

module.exports = { listGames, getGame, createGame, updateGame, deleteGame };