const express = require('express');
const { listUsers, listUserStatus, updateUserStatus, deleteOwnAccount } = require('../controllers/userController');
const { verificarUsuarioLogado } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', listUsers);
router.get('/status', listUserStatus);
router.put('/:id/status', updateUserStatus);
router.delete('/me', verificarUsuarioLogado, deleteOwnAccount);

module.exports = router;