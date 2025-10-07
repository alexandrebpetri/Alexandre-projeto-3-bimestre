const express = require('express');
const { listUsers, getUser, createUser, upsertUser, listUserStatus, updateUserStatus, deleteOwnAccount } = require('../controllers/userController');
const { verificarUsuarioLogado } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', listUsers);
router.get('/status', listUserStatus);
router.get('/statuses', listUserStatus);
router.delete('/me', verificarUsuarioLogado, deleteOwnAccount);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', upsertUser);
router.put('/:id/status', updateUserStatus);

module.exports = router;