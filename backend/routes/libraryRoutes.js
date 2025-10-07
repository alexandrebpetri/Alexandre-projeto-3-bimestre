const express = require('express');
const { addToLibrary, listLibraryByUser, deleteLibraryById, deleteLibraryByUserGame, getLibraryItemById, upsertLibraryItem } = require('../controllers/libraryController');

const router = express.Router();

router.post('/', addToLibrary);
router.get('/:userId', listLibraryByUser);
router.get('/item/:id', getLibraryItemById);
router.put('/item/:id', upsertLibraryItem);
router.delete('/:id', deleteLibraryById);
router.delete('/user/:userId/game/:gameId', deleteLibraryByUserGame);

module.exports = router;