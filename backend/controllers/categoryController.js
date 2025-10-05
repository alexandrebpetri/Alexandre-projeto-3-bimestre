const pool = require('../config/db');
const handleError = require('../middlewares/errorHandler');

async function listCategories(req, res) {
  try {
    const result = await pool.query(`SELECT * FROM category ORDER BY id ASC`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar categorias');
  }
}

async function createCategory(req, res) {
  try {
    const { name } = req.body;
    const result = await pool.query(
      `INSERT INTO category (name) VALUES ($1) RETURNING *`,
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'criar categoria');
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await pool.query(
      `UPDATE category SET name=$1 WHERE id=$2 RETURNING *`,
      [name, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'atualizar categoria');
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const depend = await pool.query(
      `SELECT * FROM game_category WHERE category_id=$1`,
      [id]
    );
    if (depend.rows.length > 0) {
      return res.status(400).json({ error: 'Categoria associada a jogos' });
    }
    await pool.query(`DELETE FROM category WHERE id=$1`, [id]);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, 'deletar categoria');
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };