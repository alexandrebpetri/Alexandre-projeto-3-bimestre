const express = require('express');
const { listDevelopers, getDeveloper, createDeveloper, updateDeveloper, deleteDeveloper } = require('../controllers/developerController');

const router = express.Router();

router.get('/', listDevelopers);
router.get('/:id', getDeveloper);
router.post('/', createDeveloper);
router.put('/:id', updateDeveloper);
router.delete('/:id', deleteDeveloper);

module.exports = router;