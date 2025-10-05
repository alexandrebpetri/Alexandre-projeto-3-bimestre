require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const categoryRoutes = require('../routes/categoryRoutes');
const developerRoutes = require('../routes/developerRoutes');
const gameRoutes = require('../routes/gameRoutes');
const libraryRoutes = require('../routes/libraryRoutes');
const imageRoutes = require('../routes/imageRoutes'); // corrigido ✅

const app = express();
const port = process.env.PORT || 3000;

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

// ================== ROTAS ==================
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/developers', developerRoutes);
app.use('/games', gameRoutes);
app.use('/api/library', libraryRoutes);
app.use('/images', imageRoutes); // aqui sim ✅

// ================== START SERVER ==================
//app.listen(port, '127.0.0.1', () => {
//  console.log(`Servidor rodando em http://127.0.0.1:${port}`);
//});