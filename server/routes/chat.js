const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const { authenticateToken } = require('../middleware/auth');

router.post('/conversations', authenticateToken, ChatController.createConversation);
router.get('/conversations', authenticateToken, ChatController.getConversations);
router.get('/conversations/:conversationId', authenticateToken, ChatController.getConversation);
router.put('/conversations/:conversationId/title', authenticateToken, ChatController.updateConversationTitle);
router.delete('/conversations/:conversationId', authenticateToken, ChatController.deleteConversation);
router.post('/conversations/:conversationId/generate-title', authenticateToken, ChatController.generateConversationTitle);

router.post('/send', authenticateToken, ChatController.sendMessage);
router.post('/send-stream', authenticateToken, ChatController.sendMessageStream);
router.get('/stats', authenticateToken, ChatController.getChatStats);
router.get('/search', authenticateToken, ChatController.searchConversations);
router.get('/conversations/:conversationId/export', authenticateToken, ChatController.exportConversation);

module.exports = router;
