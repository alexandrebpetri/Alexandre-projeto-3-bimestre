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

// Buscar categoria por id
async function getCategory(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const result = await pool.query(`SELECT * FROM category WHERE id=$1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'obter categoria');
  }
}

// Criar categoria - aceita id opcional. Se id fornecido e já existir, retorna 409
async function createCategory(req, res) {
  try {
    const { id, name } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    if (id !== undefined && id !== null) {
      // verifica existência
      const existing = await pool.query(`SELECT * FROM category WHERE id=$1`, [id]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Categoria com esse ID já existe' });
      }
      const result = await pool.query(
        `INSERT INTO category (id, name) VALUES ($1, $2) RETURNING *`,
        [id, name]
      );
      return res.status(201).json(result.rows[0]);
    }

    const result = await pool.query(`INSERT INTO category (name) VALUES ($1) RETURNING *`, [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'criar categoria');
  }
}

// Atualizar categoria com comportamento upsert: se existir atualiza, caso contrário cria (com o id informado)
async function updateCategory(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    // busca por id primeiro
    const existing = await pool.query(`SELECT * FROM category WHERE id=$1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const updateResult = await pool.query(
      `UPDATE category SET name=$1 WHERE id=$2 RETURNING *`,
      [name, id]
    );
    res.json(updateResult.rows[0]);
  } catch (err) {
    handleError(res, err, 'atualizar categoria');
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    // verifica existência
    const found = await pool.query(`SELECT id FROM category WHERE id=$1`, [id]);
    if (found.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
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

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };