const express = require('express');
const { addToLibrary } = require('../controllers/libraryController');

const router = express.Router();

router.post('/', addToLibrary);

module.exports = router;