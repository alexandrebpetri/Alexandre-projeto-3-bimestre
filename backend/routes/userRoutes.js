const express = require('express');
const { listUsers, listUserStatus, updateUserStatus } = require('../controllers/userController');

const router = express.Router();

router.get('/', listUsers);
router.get('/status', listUserStatus);
router.put('/:id/status', updateUserStatus);

module.exports = router;