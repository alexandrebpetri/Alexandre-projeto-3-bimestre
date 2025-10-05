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

async function createDeveloper(req, res) {
  try {
    const { name } = req.body;
    const result = await pool.query(
      `INSERT INTO developer (name) VALUES ($1) RETURNING *`,
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'criar dev');
  }
}

async function updateDeveloper(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await pool.query(
      `UPDATE developer SET name=$1 WHERE id=$2 RETURNING *`,
      [name, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'atualizar dev');
  }
}

async function deleteDeveloper(req, res) {
  try {
    const { id } = req.params;
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

module.exports = { listDevelopers, createDeveloper, updateDeveloper, deleteDeveloper };