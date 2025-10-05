const express = require('express');
const { register, login, logout, me } = require('../controllers/authController');
const { verificarUsuarioLogado } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', verificarUsuarioLogado, me);

module.exports = router;