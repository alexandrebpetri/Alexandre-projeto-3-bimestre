require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
// Import controller functions used directly to guarantee specific routes
const { listUserStatus } = require('../controllers/userController');
const categoryRoutes = require('../routes/categoryRoutes');
const developerRoutes = require('../routes/developerRoutes');
const gameRoutes = require('../routes/gameRoutes');
const libraryRoutes = require('../routes/libraryRoutes');
const imageRoutes = require('../routes/imageRoutes'); // corrigido ✅

const app = express();
const port = process.env.PORT || 3000;

// ================== MIDDLEWARES ==================
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
  'http://localhost:3001'
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ================== ROTAS ==================
app.use('/auth', authRoutes);
// Ensure status endpoints are registered before the dynamic /users/:id route
app.get('/users/status', listUserStatus);
app.get('/users/statuses', listUserStatus);
app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/developers', developerRoutes);
app.use('/games', gameRoutes);
app.use('/api/library', libraryRoutes);
app.use('/images', imageRoutes); // aqui sim ✅

// rotas registradas normalmente (debug removido)

// ================== START SERVER ==================
app.listen(port, '127.0.0.1', () => {
  console.log(`Servidor rodando em http://127.0.0.1:${port}`);
});