require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const tables = [
  { table: 'category', column: 'id' },
  { table: 'developer', column: 'id' },
  { table: 'games', column: 'id' },
  { table: 'image', column: 'id' },
  { table: 'user_status', column: 'id' },
  { table: 'users', column: 'id' },
  { table: 'library', column: 'id' }
];

(async () => {
  try {
    for (const t of tables) {
      const sql = `SELECT setval(pg_get_serial_sequence('${t.table}','${t.column}'), COALESCE(MAX(${t.column}), 1)) FROM ${t.table};`;
      const res = await pool.query(sql);
      console.log(`Sequence adjusted for ${t.table}.${t.column}`);
    }
    console.log('Todas sequences ajustadas.');
  } catch (err) {
    console.error('Erro ao ajustar sequences:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
