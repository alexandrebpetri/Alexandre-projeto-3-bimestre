require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

const { gerarToken, verificarToken } = require('./jwt');

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

// Configuração do multer para armazenar arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ==============================================
// Rotas de Usuário e Admin (Padrão /api)
// ==============================================

// REGISTRO
app.post('/auth/register', async (req, res) => {
  const { email, nickname, password, confirmPassword, adminCode } = req.body;

  if (!email || !nickname || !password || !confirmPassword)
    return res.status(400).json({ erro: 'Campos obrigatórios' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ erro: 'Email inválido' });

  if (password !== confirmPassword)
    return res.status(400).json({ erro: 'Senhas diferentes' });

  if (password.length < 6)
    return res.status(400).json({ erro: 'Senha precisa ter ao menos 6 caracteres' });

  try {
    const existingUser = await prisma.users.findFirst({
      where: { OR: [{ email }, { nickname }] }
    });
    if (existingUser)
      return res.status(400).json({ erro: 'Email ou nickname já cadastrado' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // user_status: 1 = admin, 2 = comum
    const isAdmin = adminCode === 'CODIGO_SECRETO_ADMIN';
    const statusId = isAdmin ? 1 : 2;

    const novoUsuario = await prisma.users.create({
      data: {
        email,
        nickname,
        password: hashedPassword,
        user_status: statusId
      }
    });

    // Gere o token JWT
    const token = gerarToken({ id: novoUsuario.id });

    // Envie o cookie JWT
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // true em produção
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    res.json({
      authenticated: true,
      user: {
        id: novoUsuario.id,
        email: novoUsuario.email,
        nickname: novoUsuario.nickname
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno no registro' });
  }
});

// LOGIN
app.post('/auth/login', async (req, res) => {
  const { user, password } = req.body;
  if (!user || !password)
    return res.status(400).json({ erro: 'Email/nickname e senha obrigatórios' });

  try {
    const userData = await prisma.users.findFirst({
      where: {
        OR: [
          { email: user },
          { nickname: user }
        ]
      }
    });

    if (!userData)
      return res.status(400).json({ erro: 'Credenciais inválidas' });

    const senhaCorreta = await bcrypt.compare(password, userData.password);
    if (!senhaCorreta)
      return res.status(400).json({ erro: 'Credenciais inválidas' });

    const isAdmin = userData.user_status === 1;

    const token = gerarToken({ id: userData.id, email: userData.email, isAdmin });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production' ? true : false
    });

    // Adicione os dados do usuário no retorno!
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
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
});

// LOGOUT
app.get('/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production' ? true : false,
    path: '/',
  });
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production' ? true : false,
    path: '/',
  });
  res.json({ sucesso: true });
});

// INFO DO USUÁRIO LOGADO
app.get('/auth/me', verificarUsuarioLogado, async (req, res) => {
  const user = await prisma.users.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, nickname: true, user_status: true }
  });
  if (!user) return res.json({ authenticated: false });
  res.json({
    authenticated: true,
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    isAdmin: user.user_status === 1
  });
});

// Middleware para admin
async function ensureAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ erro: 'Não autenticado' });
  const user = await prisma.users.findUnique({ where: { id: req.userId } });
  if (user && user.user_status === 1) return next();
  res.status(403).json({ erro: 'Acesso restrito a administradores' });
}

// PROMOVER USUÁRIO A ADMIN
app.put('/auth/admin/promote/:id', verificarUsuarioLogado, ensureAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' });

  await prisma.users.update({
    where: { id: userId },
    data: { user_status: 1 }
  });
  res.json({ sucesso: true });
});

// LISTAR ADMINS
app.get('/auth/admin/list', verificarUsuarioLogado, ensureAdmin, async (req, res) => {
  const admins = await prisma.users.findMany({
    where: { user_status: 1 },
    select: { id: true, email: true, nickname: true }
  });
  res.json(admins);
});

// REMOVER ADMIN (rebaixar para usuário comum)
app.delete('/auth/admin/remove/:id', verificarUsuarioLogado, ensureAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ erro: 'Usuário não encontrado' });

  await prisma.users.update({
    where: { id: userId },
    data: { user_status: 2 }
  });
  res.json({ sucesso: true, mensagem: 'Admin removido com sucesso' });
});

// =============================
// CRUD de Status de Usuários
// =============================

// 1. Listar todos os usuários
// Endpoint para listar usuários com nome do status
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      include: {
        user_status_users_user_statusTouser_status: true, // garante que a relação seja carregada
      },
    });

    // Mapear os usuários para retornar um objeto limpo
    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      user_status: u.user_status,
      status_name: u.user_status_users_user_statusTouser_status?.name || 'Sem status'
    }));

    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Endpoint para listar todos os status disponíveis
app.get('/user-status', async (req, res) => {
  try {
    const statuses = await prisma.user_status.findMany({
      select: { id: true, name: true }
    });

    // Retorna sempre um array (mesmo que vazio)
    res.json(statuses);
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).send('Erro interno do servidor');
  }
});


// 2. Listar todos os status disponíveis
app.get('/user-status', async (req, res) => {
  try {
    const statuses = await prisma.user_status.findMany({
      select: { id: true, name: true }
    });
    res.json(statuses);
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// 3. Atualizar o status de um usuário (exceto Admin_Supremo id=1)
app.put('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { user_status } = req.body;

  try {
    const userId = parseInt(id, 10);

    if (userId === 1) {
      return res.status(403).json({ error: 'O Admin_Supremo não pode ter o status alterado.' });
    }

    // Verifica se o usuário existe
    const existingUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Verifica se o status existe
    const existingStatus = await prisma.user_status.findUnique({ where: { id: user_status } });
    if (!existingStatus) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    // Atualiza apenas o campo user_status
    const updated = await prisma.users.update({
      where: { id: userId },
      data: { user_status }
    });

    res.json({
      message: 'Status atualizado com sucesso!',
      user: {
        id: updated.id,
        email: updated.email,
        nickname: updated.nickname,
        user_status: updated.user_status
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar status do usuário:', error);
    res.status(500).send('Erro interno do servidor');
  }
});


// ==============================================
// Rotas Básicas
// ==============================================

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Bem-vindo à API do Jurassic Hub',
    endpoints: {
      categories: '/categories',
      developers: '/developers',
      games: '/games',
      images: '/images'
    }
  });
});

// ==============================================
// Rotas para Category
// ==============================================

app.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const newCategory = await prisma.category.create({ data: { name } });
    res.status(201).json(newCategory);
  } catch (error) {
    handleError(res, error, 'criar categoria');
  }
});

app.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.json(categories);
  } catch (error) {
    handleError(res, error, 'buscar categorias');
  }
});

app.get('/categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(category);
  } catch (error) {
    handleError(res, error, 'buscar categoria');
  }
});

app.put('/categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name }
    });
    res.json(updatedCategory);
  } catch (error) {
    handleError(res, error, 'atualizar categoria');
  }
});

app.delete('/categories/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const gameCategories = await prisma.game_category.findMany({
      where: { category_id: id }
    });

    if (gameCategories.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar. Existem jogos associados a esta categoria.' 
      });
    }

    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'deletar categoria');
  }
});

// ==============================================
// Rotas para Developer
// ==============================================

app.post('/developers', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const newDeveloper = await prisma.developer.create({ data: { name } });
    res.status(201).json(newDeveloper);
  } catch (error) {
    handleError(res, error, 'criar desenvolvedor');
  }
});

app.get('/developers', async (req, res) => {
  try {
    const developers = await prisma.developer.findMany({ orderBy: { id: 'asc' } });
    res.json(developers);
  } catch (error) {
    handleError(res, error, 'buscar desenvolvedores');
  }
});

app.get('/developers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const developer = await prisma.developer.findUnique({
      where: { id },
      include: { games: true }
    });

    if (!developer) return res.status(404).json({ error: 'Desenvolvedor não encontrado' });
    res.json(developer);
  } catch (error) {
    handleError(res, error, 'buscar desenvolvedor');
  }
});

app.put('/developers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const updatedDeveloper = await prisma.developer.update({
      where: { id },
      data: { name }
    });
    res.json(updatedDeveloper);
  } catch (error) {
    handleError(res, error, 'atualizar desenvolvedor');
  }
});

app.delete('/developers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const games = await prisma.games.findMany({ where: { developer_id: id } });

    if (games.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar. Existem jogos associados a este desenvolvedor.' 
      });
    }

    await prisma.developer.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'deletar desenvolvedor');
  }
});

// ==============================================
// Rotas para Games
// ==============================================

app.post('/games', async (req, res) => {
  try {
    const { name, description, price, release_date, developer_id, categories } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const gameData = {
      name,
      description,
      price: price ? parseFloat(price) : null,
      release_date: release_date ? new Date(release_date) : null,
      developer_id: developer_id ? parseInt(developer_id) : null
    };

    const newGame = await prisma.games.create({ data: gameData });

    if (categories && Array.isArray(categories)) {
      await Promise.all(categories.map(async (categoryId) => {
        await prisma.game_category.create({
          data: {
            game_id: newGame.id,
            category_id: parseInt(categoryId)
          }
        });
      }));
    }

    const fullGame = await getFullGameDetails(newGame.id);
    res.status(201).json(fullGame);
  } catch (error) {
    handleError(res, error, 'criar jogo');
  }
});

app.get('/games', async (req, res) => {
  try {
    const games = await prisma.games.findMany({
      orderBy: { id: 'asc' },
      include: {
        developer: true,
        game_category: { include: { category: true } },
        image_games_image_idToimage: true
      }
    });

    const formatted = games.map(formatGameData);
    res.json(formatted);
  } catch (error) {
    handleError(res, error, 'buscar jogos');
  }
});

app.get('/games/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const fullGame = await getFullGameDetails(id);

    if (!fullGame) return res.status(404).json({ error: 'Jogo não encontrado' });
    res.json(fullGame);
  } catch (error) {
    handleError(res, error, 'buscar jogo');
  }
});

app.put('/games/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, price, release_date, developer_id, categories } = req.body;

    const gameData = {
      name,
      description,
      price: price ? parseFloat(price) : null,
      release_date: release_date ? new Date(release_date) : null,
      developer_id: developer_id ? parseInt(developer_id) : null
    };

    await prisma.games.update({
      where: { id },
      data: gameData
    });

    if (categories && Array.isArray(categories)) {
      await prisma.game_category.deleteMany({ where: { game_id: id } });

      await Promise.all(categories.map(async (categoryId) => {
        await prisma.game_category.create({
          data: {
            game_id: id,
            category_id: parseInt(categoryId)
          }
        });
      }));
    }

    const fullGame = await getFullGameDetails(id);
    res.json(fullGame);
  } catch (error) {
    handleError(res, error, 'atualizar jogo');
  }
});

app.delete('/games/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.game_category.deleteMany({ where: { game_id: id } });
    await prisma.games.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'deletar jogo');
  }
});

// ==============================================
// Rotas para Game_Category
// ==============================================

app.post('/games/:gameId/categories/:categoryId', async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const categoryId = parseInt(req.params.categoryId);

    const game = await prisma.games.findUnique({ where: { id: gameId } });
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });

    const existing = await prisma.game_category.findUnique({
      where: { game_id_category_id: { game_id: gameId, category_id: categoryId } }
    });

    if (existing) {
      return res.status(400).json({ error: 'Esta categoria já está associada ao jogo' });
    }

    const newAssociation = await prisma.game_category.create({
      data: { game_id: gameId, category_id: categoryId }
    });

    res.status(201).json(newAssociation);
  } catch (error) {
    handleError(res, error, 'associar categoria ao jogo');
  }
});

app.delete('/games/:gameId/categories/:categoryId', async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const categoryId = parseInt(req.params.categoryId);

    await prisma.game_category.delete({
      where: { game_id_category_id: { game_id: gameId, category_id: categoryId } }
    });

    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'remover categoria do jogo');
  }
});

// Adicionar jogo à biblioteca do usuário
app.post('/api/library', async (req, res) => {
  const { userId, gameId } = req.body;
  if (!userId || !gameId) {
    return res.status(400).json({ error: 'userId e gameId são obrigatórios' });
  }
  try {
    const novaEntrada = await prisma.library.create({
      data: {
        user_id: Number(userId),
        game_id: Number(gameId)
      }
    });
    res.status(201).json(novaEntrada);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar à biblioteca', details: err.message });
  }
});

// ==============================================
// Rotas para Image
// ==============================================

app.get('/images', async (req, res) => {
  try {
    const images = await prisma.image.findMany({
      include: {
        games_image_game_idTogames: { select: { id: true, name: true } }
      }
    });

    const formatted = images.map(img => ({
      id: img.id,
      game_id: img.game_id,
      game_name: img.games_image_game_idTogames?.name || null,
      size_kb: Math.round(img.data.length / 1024)
    }));

    res.json(formatted);
  } catch (error) {
    handleError(res, error, 'buscar imagens');
  }
});

app.post('/upload/:gameId', upload.single('image'), async (req, res) => {
  try {
    const { gameId } = req.params;
    const imageBuffer = req.file?.buffer;

    if (!gameId || isNaN(gameId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const game = await prisma.games.findUnique({ where: { id: parseInt(gameId) } });
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });

    const existingImage = await prisma.image.findFirst({ where: { game_id: game.id } });

    let newImage;
    if (existingImage) {
      newImage = await prisma.image.update({
        where: { id: existingImage.id },
        data: { data: imageBuffer }
      });
    } else {
      newImage = await prisma.image.create({
        data: { data: imageBuffer, game_id: game.id }
      });

      await prisma.games.update({
        where: { id: game.id },
        data: { image_id: newImage.id }
      });
    }

    res.status(200).json({ 
      message: 'Imagem enviada com sucesso', 
      imageId: newImage.id,
      gameId: game.id
    });
  } catch (error) {
    handleError(res, error, 'salvar imagem');
  }
});

app.get('/image/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Definir headers para exibir a imagem corretamente
    res.setHeader('Content-Type', 'image/png'); // ou image/jpeg dependendo do upload
    res.send(image.data);
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    res.status(500).json({ error: 'Erro interno ao buscar imagem' });
  }
});


app.put('/images/:id/reassign', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { game_id } = req.body;

    if (!game_id || isNaN(game_id)) {
      return res.status(400).json({ error: 'ID de jogo inválido' });
    }

    const game = await prisma.games.findUnique({ where: { id: game_id } });
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) return res.status(404).json({ error: 'Imagem não encontrada' });

    if (image.game_id) {
      await prisma.games.updateMany({
        where: { image_id: id },
        data: { image_id: null }
      });
    }

    const updatedImage = await prisma.image.update({
      where: { id },
      data: { game_id }
    });

    await prisma.games.update({
      where: { id: game_id },
      data: { image_id: updatedImage.id }
    });

    res.json({ 
      message: 'Imagem reassociada com sucesso',
      image: updatedImage
    });
  } catch (error) {
    handleError(res, error, 'reassociar imagem');
  }
});

app.delete('/images/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const image = await prisma.image.findUnique({
      where: { id },
      select: { game_id: true }
    });

    if (image?.game_id) {
      await prisma.games.update({
        where: { id: image.game_id },
        data: { image_id: null }
      });
    }

    await prisma.image.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'excluir imagem');
  }
});

// ==============================================
// Funções auxiliares
// ==============================================

async function getFullGameDetails(gameId) {
  return await prisma.games.findUnique({
    where: { id: gameId },
    include: {
      developer: true,
      game_category: { include: { category: true } },
      image_games_image_idToimage: true
    }
  });
}

function formatGameData(game) {
  return {
    id: game.id,
    name: game.name,
    image: game.image_games_image_idToimage && game.image_games_image_idToimage.data
      ? `data:image/jpeg;base64,${Buffer.from(game.image_games_image_idToimage.data).toString('base64')}`
      : null,
    description: game.description,
    price: game.price,
    release_date: game.release_date,
    developer: game.developer,
    categories: game.game_category.map(gc => gc.category.name)
  };
}

function handleError(res, error, action, jsonResponse = true) {
  console.error(`Erro ao ${action}:`, error);
  const errorMessage = error.message || `Erro ao ${action}`;
  
  if (jsonResponse) {
    res.status(500).json({ error: errorMessage });
  } else {
    res.status(500).send(errorMessage);
  }
}

function verificarUsuarioLogado(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ erro: 'Usuário não autenticado.' });
  }
  try {
    const payload = verificarToken(token);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

// Inicia o servidor
app.listen(port, '127.0.0.1', () => {
  console.log(`Servidor rodando em http://127.0.0.1:${port}`);
});