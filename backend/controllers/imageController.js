const pool = require('../config/db');
const handleError = require('../middlewares/errorHandler');

async function listImages(req, res) {
  try {
    const result = await pool.query(`
      SELECT i.id, i.game_id, g.name as game_name, octet_length(i.data) as size
      FROM image i
      LEFT JOIN games g ON i.game_id = g.id
    `);
    res.json(result.rows.map(r => ({
      id: r.id,
      game_id: r.game_id,
      game_name: r.game_name,
      size_kb: Math.round(r.size / 1024)
    })));
  } catch (err) {
    handleError(res, err, 'listar imagens');
  }
}

async function uploadImage(req, res) {
  try {
    const { gameId } = req.params;
    const buffer = req.file?.buffer;

    if (!buffer) return res.status(400).json({ error: 'Arquivo não enviado' });

    // Verifica se o jogo existe
    const gameCheck = await pool.query('SELECT id FROM games WHERE id=$1', [gameId]);
    if (gameCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Jogo não encontrado' });
    }

    const existing = await pool.query('SELECT * FROM image WHERE game_id=$1', [gameId]);

    let img;
    if (existing.rows.length > 0) {
      // atualiza imagem existente
      img = await pool.query('UPDATE image SET data=$1 WHERE id=$2 RETURNING id', [buffer, existing.rows[0].id]);
      // garante que games.image_id está sincronizado (opcional)
      await pool.query('UPDATE games SET image_id=$1 WHERE id=$2', [existing.rows[0].id, gameId]);
    } else {
      // insere nova imagem e atualiza games.image_id
      img = await pool.query('INSERT INTO image (data, game_id) VALUES ($1,$2) RETURNING id', [buffer, gameId]);
      await pool.query('UPDATE games SET image_id=$1 WHERE id=$2', [img.rows[0].id, gameId]);
    }

    res.json({ success: true, imageId: img.rows[0].id });
  } catch (err) {
    handleError(res, err, 'upload imagem');
  }
}

async function getImage(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT data FROM image WHERE id=$1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Não encontrada' });
    res.setHeader('Content-Type', 'image/png');
    res.send(result.rows[0].data);
  } catch (err) {
    handleError(res, err, 'buscar imagem');
  }
}

async function deleteImage(req, res) {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE games SET image_id=NULL WHERE image_id=$1`, [id]);
    await pool.query(`DELETE FROM image WHERE id=$1`, [id]);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, 'deletar imagem');
  }
}

module.exports = { listImages, uploadImage, getImage, deleteImage };