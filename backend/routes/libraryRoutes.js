const express = require('express');
const { addToLibrary, listLibraryByUser, deleteLibraryById, deleteLibraryByUserGame } = require('../controllers/libraryController');

const router = express.Router();

router.post('/', addToLibrary);
router.get('/:userId', listLibraryByUser);
router.delete('/:id', deleteLibraryById);
router.delete('/user/:userId/game/:gameId', deleteLibraryByUserGame);

module.exports = router;