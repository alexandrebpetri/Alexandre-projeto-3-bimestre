const express = require('express');
const { listDevelopers, createDeveloper, updateDeveloper, deleteDeveloper } = require('../controllers/developerController');

const router = express.Router();

router.get('/', listDevelopers);
router.post('/', createDeveloper);
router.put('/:id', updateDeveloper);
router.delete('/:id', deleteDeveloper);

module.exports = router;