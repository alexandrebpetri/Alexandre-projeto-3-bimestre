const express = require('express');
const { listGames, createGame, updateGame, deleteGame } = require('../controllers/gameController');

const router = express.Router();

router.get('/', listGames);
router.post('/', createGame);
router.put('/:id', updateGame);
router.delete('/:id', deleteGame);

module.exports = router;