const pool = require('../config/db');
const handleError = require('../middlewares/errorHandler');

async function listDevelopers(req, res) {
  try {
    const result = await pool.query(`SELECT * FROM developer ORDER BY id ASC`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar devs');
  }
}

async function getDeveloper(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const result = await pool.query('SELECT * FROM developer WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Developer não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'obter dev');
  }
}

async function createDeveloper(req, res) {
  try {
    const { id, name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    // verifica se id informado já existe antes de criar
    if (id !== undefined && id !== null) {
      const existing = await pool.query(`SELECT * FROM developer WHERE id=$1`, [id]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Developer com esse ID já existe' });
      const result = await pool.query(`INSERT INTO developer (id, name) VALUES ($1,$2) RETURNING *`, [id, name]);
      return res.status(201).json(result.rows[0]);
    }

    const result = await pool.query(`INSERT INTO developer (name) VALUES ($1) RETURNING *`, [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'criar dev');
  }
}

async function updateDeveloper(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    // busca por id primeiro
    const existing = await pool.query(`SELECT * FROM developer WHERE id=$1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Developer não encontrado' });

    const result = await pool.query(`UPDATE developer SET name=$1 WHERE id=$2 RETURNING *`, [name, id]);
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'atualizar dev');
  }
}

async function deleteDeveloper(req, res) {
  try {
    const { id } = req.params;
    // verifica existência
    const found = await pool.query(`SELECT id FROM developer WHERE id=$1`, [id]);
    if (found.rows.length === 0) return res.status(404).json({ error: 'Developer não encontrado' });

    const depend = await pool.query(`SELECT * FROM games WHERE developer_id=$1`, [id]);
    if (depend.rows.length > 0) {
      return res.status(400).json({ error: 'Dev associado a jogos' });
    }
    await pool.query(`DELETE FROM developer WHERE id=$1`, [id]);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, 'deletar dev');
  }
}

module.exports = { listDevelopers, getDeveloper, createDeveloper, updateDeveloper, deleteDeveloper };