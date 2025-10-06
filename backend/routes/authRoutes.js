const express = require('express');
const { register, login, logout, me, checkPassword } = require('../controllers/authController');
const { deleteOwnAccount } = require('../controllers/userController');
const { verificarUsuarioLogado } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', verificarUsuarioLogado, me);
router.post('/check-password', verificarUsuarioLogado, checkPassword);
// Alias para compatibilidade com frontend: permite DELETE /auth/delete-account
router.delete('/delete-account', verificarUsuarioLogado, deleteOwnAccount);

module.exports = router;