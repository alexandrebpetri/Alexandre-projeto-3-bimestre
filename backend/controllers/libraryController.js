const pool = require('../config/db');
const handleError = require('../middlewares/errorHandler');

async function addToLibrary(req, res) {
  const { userId, gameId } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO library (user_id, game_id) VALUES ($1,$2) RETURNING *`,
      [userId, gameId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleError(res, err, 'adicionar à biblioteca');
  }
}

module.exports = { addToLibrary };