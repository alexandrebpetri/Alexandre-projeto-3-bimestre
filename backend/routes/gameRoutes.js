const express = require('express');
const { listGames, getGame, createGame, updateGame, deleteGame } = require('../controllers/gameController');

const router = express.Router();

router.get('/', listGames);
router.get('/:id', getGame);
router.post('/', createGame);
router.put('/:id', updateGame);
router.delete('/:id', deleteGame);

module.exports = router;