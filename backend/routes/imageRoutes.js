const express = require('express');
const multer = require('multer');
const {
  listImages,
  uploadImage,
  getImage,
  deleteImage
} = require('../controllers/imageController');

const router = express.Router();

// Configuração do Multer (apenas para upload de imagens)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Rotas
router.get('/', listImages);
router.post('/upload/:gameId', upload.single('image'), uploadImage); // ⬅️ aqui o multer age só no upload
router.get('/:id', getImage);
router.delete('/:id', deleteImage);

module.exports = router;