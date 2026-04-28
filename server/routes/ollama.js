const express = require('express');
const router = express.Router();
const OllamaController = require('../controllers/OllamaController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

router.get('/health', OllamaController.healthCheck);
router.get('/connection', OllamaController.checkConnection);
router.get('/models', optionalAuth, OllamaController.getModels);
router.get('/models/:modelName/info', optionalAuth, OllamaController.getModelInfo);
router.post('/models/pull', authenticateToken, OllamaController.pullModel);
router.delete('/models/:modelName', authenticateToken, OllamaController.deleteModel);
router.post('/generate', optionalAuth, OllamaController.generateResponse);
router.post('/embeddings', optionalAuth, OllamaController.generateEmbedding);
router.post('/models/create', authenticateToken, OllamaController.createModel);

module.exports = router;
