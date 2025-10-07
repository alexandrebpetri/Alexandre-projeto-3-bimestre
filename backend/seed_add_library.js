const pool = require('./config/db');

async function addIfNotExists(userId, gameId) {
  try {
    const exists = await pool.query('SELECT id FROM library WHERE user_id=$1 AND game_id=$2', [userId, gameId]);
    if (exists.rowCount > 0) {
      console.log(`Já existe um registro na biblioteca para userId=${userId} gameId=${gameId} (id=${exists.rows[0].id})`);
      return;
    }

    const res = await pool.query('INSERT INTO library (user_id, game_id) VALUES ($1,$2) RETURNING *', [userId, gameId]);
    console.log('Registro criado com sucesso:', res.rows[0]);
  } catch (err) {
    console.error('Erro ao inserir na library:', err.message || err);
  } finally {
    // encerra a pool para terminar o processo
    await pool.end();
  }
}

(async () => {
  // Altere aqui os ids se quiser testar outros
  await addIfNotExists();
})();
