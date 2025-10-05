require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const { gerarToken, verificarToken } = require('./utils/jwt');


const app = express();
const port = process.env.PORT || 3000;

// ================== CONEXÃO DB ==================
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ================== MIDDLEWARES ==================
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:5501',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(cookieParser());

// Configuração do multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ================== FUNÇÕES AUXILIARES ==================
function handleError(res, error, action, jsonResponse = true) {
  console.error(`Erro ao ${action}:`, error);
  const msg = error.message || `Erro ao ${action}`;
  if (jsonResponse) res.status(500).json({ error: msg });
  else res.status(500).send(msg);
}

function verificarUsuarioLogado(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ erro: 'Usuário não autenticado.' });
  try {
    const payload = verificarToken(token);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

// ================== AUTENTICAÇÃO ==================
app.post('/auth/register', async (req, res) => {
  const { email, nickname, password, confirmPassword, adminCode } = req.body;
  if (!email || !nickname || !password || !confirmPassword)
    return res.status(400).json({ erro: 'Campos obrigatórios' });
  if (password !== confirmPassword)
    return res.status(400).json({ erro: 'Senhas diferentes' });

  try {
    const existing = await pool.query(
      `SELECT * FROM users WHERE email=$1 OR nickname=$2`,
      [email, nickname]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ erro: 'Email ou nickname já cadastrado' });

    const hashed = await bcrypt.hash(password, 10);
    const isAdmin = adminCode === 'CODIGO_SECRETO_ADMIN';
    const statusId = isAdmin ? 1 : 2;

    const result = await pool.query(
      `INSERT INTO users (email, nickname, password, user_status) 
       VALUES ($1,$2,$3,$4) RETURNING id,email,nickname`,
      [email, nickname, hashed, statusId]
    );

    const novoUsuario = result.rows[0];
    const token = gerarToken({ id: novoUsuario.id });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ authenticated: true, user: novoUsuario });
  } catch (err) {
    handleError(res, err, 'registrar usuário');
  }
});

app.post('/auth/login', async (req, res) => {
  const { user, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email=$1 OR nickname=$1`,
      [user]
    );
    const userData = result.rows[0];
    if (!userData) return res.status(400).json({ erro: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, userData.password);
    if (!ok) return res.status(400).json({ erro: 'Credenciais inválidas' });

    const isAdmin = userData.user_status === 1;
    const token = gerarToken({ id: userData.id, email: userData.email, isAdmin });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({
      sucesso: true,
      mensagem: 'Login bem-sucedido',
      isAdmin,
      user: {
        id: userData.id,
        email: userData.email,
        nickname: userData.nickname,
        user_status: userData.user_status
      }
    });
  } catch (err) {
    handleError(res, err, 'fazer login');
  }
});

app.get('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ sucesso: true });
});

app.get('/auth/me', verificarUsuarioLogado, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,email,nickname,user_status FROM users WHERE id=$1`,
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.json({ authenticated: false });
    res.json({
      authenticated: true,
      ...user,
      isAdmin: user.user_status === 1
    });
  } catch (err) {
    handleError(res, err, 'buscar usuário logado');
  }
});

// ================== USERS ==================
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.nickname, u.user_status, s.name as status_name
      FROM users u
      LEFT JOIN user_status s ON u.user_status = s.id
      ORDER BY u.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar usuários');
  }
});

app.get('/user-status', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id,name FROM user_status`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar status');
  }
});

app.put('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { user_status } = req.body;
  try {
    if (parseInt(id) === 1) {
      return res.status(403).json({ error: 'O Admin_Supremo não pode ter o status alterado.' });
    }
    const result = await pool.query(
      `UPDATE users SET user_status=$1 WHERE id=$2 RETURNING id,email,nickname,user_status`,
      [user_status, id]
    );
    res.json({ message: 'Status atualizado!', user: result.rows[0] });
  } catch (err) {
    handleError(res, err, 'atualizar status usuário');
  }
});

// Rota para listar status de usuários
app.get('/users/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_status ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar status de usuários');
  }
});

// ================== CATEGORIES ==================
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM category ORDER BY id ASC`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar categorias');
  }
});

app.post('/categories', async (req, res) => {
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
});

app.put('/categories/:id', async (req, res) => {
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
});

app.delete('/categories/:id', async (req, res) => {
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
});

// ================== DEVELOPERS ==================
app.get('/developers', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM developer ORDER BY id ASC`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err, 'listar devs');
  }
});

app.post('/developers', async (req, res) => {
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
});

app.put('/developers/:id', async (req, res) => {
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
});

app.delete('/developers/:id', async (req, res) => {
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
});

// ================== GAMES ==================
app.get('/games', async (req, res) => {
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
        SELECT c.name FROM game_category gc
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
});


// Criar jogo
app.post('/games', async (req, res) => {
  try {
    const { name, price, release_date, developer_id, description, categories } = req.body;

    const result = await pool.query(
      `INSERT INTO games (name, price, release_date, developer_id, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, price, release_date, developer_id, description`,
      [name, price, release_date, developer_id, description]
    );

    const newGame = result.rows[0];

    // associa categorias (se tiver)
    if (categories && categories.length > 0) {
      for (let catId of categories) {
        await pool.query(
          `INSERT INTO game_category (game_id, category_id) VALUES ($1, $2)`,
          [newGame.id, catId]
        );
      }
    }

    res.json(newGame); // <-- aqui garante que volta { id: ... }
  } catch (err) {
    handleError(res, err, 'criar jogo');
  }
});


app.put('/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, release_date, developer_id, categories } = req.body;
    const result = await pool.query(
      `UPDATE games SET name=$1, description=$2, price=$3, release_date=$4, developer_id=$5 WHERE id=$6 RETURNING id, name, price, release_date, developer_id, description`,
      [name, description, price, release_date, developer_id, id]
    );
    const updatedGame = result.rows[0];
    // atualiza categorias somente se `categories` for fornecido no body
    if (typeof categories !== 'undefined') {
      // se for array (mesmo vazia), substitui as associações
      await pool.query(`DELETE FROM game_category WHERE game_id=$1`, [id]);
      if (Array.isArray(categories) && categories.length > 0) {
        for (const cat of categories) {
          await pool.query(`INSERT INTO game_category (game_id, category_id) VALUES ($1,$2)`, [id, cat]);
        }
      }
    }
  // retorna o jogo atualizado para que o frontend receba o id (usado para upload de imagem)
  res.json(updatedGame);
  } catch (err) {
    handleError(res, err, 'atualizar jogo');
  }
});

app.delete('/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM game_category WHERE game_id=$1`, [id]);
    await pool.query(`DELETE FROM games WHERE id=$1`, [id]);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, 'deletar jogo');
  }
});

// ================== LIBRARY ==================
app.post('/api/library', async (req, res) => {
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
});

// ================== IMAGES ==================
app.get('/images', async (req, res) => {
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
});

app.post('/upload/:gameId', upload.single('image'), async (req, res) => {
  try {
    const { gameId } = req.params;
    const buffer = req.file?.buffer;
    const existing = await pool.query(`SELECT * FROM image WHERE game_id=$1`, [gameId]);
    let img;
    if (existing.rows.length > 0) {
      img = await pool.query(`UPDATE image SET data=$1 WHERE id=$2 RETURNING id`, [buffer, existing.rows[0].id]);
    } else {
      img = await pool.query(`INSERT INTO image (data, game_id) VALUES ($1,$2) RETURNING id`, [buffer, gameId]);
      await pool.query(`UPDATE games SET image_id=$1 WHERE id=$2`, [img.rows[0].id, gameId]);
    }
    res.json({ sucesso: true, imageId: img.rows[0].id });
  } catch (err) {
    handleError(res, err, 'upload imagem');
  }
});

app.get('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT data FROM image WHERE id=$1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Não encontrada' });
    res.setHeader('Content-Type', 'image/png');
    res.send(result.rows[0].data);
  } catch (err) {
    handleError(res, err, 'buscar imagem');
  }
});

app.delete('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE games SET image_id=NULL WHERE image_id=$1`, [id]);
    await pool.query(`DELETE FROM image WHERE id=$1`, [id]);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, 'deletar imagem');
  }
});

// ================== START SERVER ==================
app.listen(port, '127.0.0.1', () => {
  console.log(`Servidor rodando em http://127.0.0.1:${port}`);
});