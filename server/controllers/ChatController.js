const ChatService = require('../services/ChatService');

class ChatController {
  async createConversation(req, res) {
    try {
      const { title, modelName } = req.body;
      const userId = req.user.id;

      const conversation = await ChatService.createConversation(userId, title, modelName);
      
      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: conversation
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const { conversationId, message, modelName } = req.body;
      const userId = req.user.id;

      if (!conversationId || !message) {
        return res.status(400).json({
          success: false,
          error: 'Conversation ID and message are required'
        });
      }

      const result = await ChatService.sendMessage(userId, conversationId, message, modelName);
      
      res.status(200).json({
        success: true,
        message: 'Message sent successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async sendMessageStream(req, res) {
    try {
      const { conversationId, message, modelName } = req.body;
      const userId = req.user.id;

      if (!conversationId || !message) {
        return res.status(400).json({
          success: false,
          error: 'Conversation ID and message are required'
        });
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      let assistantMessageId = null;

      const onChunk = (chunk, fullResponse, done) => {
        if (done) {
          res.write(`data: ${JSON.stringify({ type: 'done', content: fullResponse })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk, fullResponse })}\n\n`);
        }
      };

      const result = await ChatService.sendMessageStream(userId, conversationId, message, modelName, onChunk);
      
      res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }

  async getConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = await ChatService.getConversation(userId, conversationId);
      
      res.status(200).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async getConversations(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const conversations = await ChatService.getUserConversations(userId, limit, offset);
      
      res.status(200).json({
        success: true,
        data: conversations,
        pagination: {
          limit,
          offset,
          count: conversations.length
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const deleted = await ChatService.deleteConversation(userId, conversationId);
      
      if (deleted) {
        res.status(200).json({
          success: true,
          message: 'Conversation deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateConversationTitle(req, res) {
    try {
      const { conversationId } = req.params;
      const { title } = req.body;
      const userId = req.user.id;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: 'Title is required'
        });
      }

      const conversation = await ChatService.updateConversationTitle(userId, conversationId, title);
      
      res.status(200).json({
        success: true,
        message: 'Conversation title updated successfully',
        data: conversation
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getChatStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await ChatService.getChatStats(userId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async searchConversations(req, res) {
    try {
      const { q: query } = req.query;
      const userId = req.user.id;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const limit = parseInt(req.query.limit) || 20;
      const conversations = await ChatService.searchConversations(userId, query, limit);
      
      res.status(200).json({
        success: true,
        data: conversations,
        query: query
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async exportConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const { format = 'json' } = req.query;
      const userId = req.user.id;

      const result = await ChatService.exportConversation(userId, conversationId, format);
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      } else if (format === 'txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      }

      res.status(200).send(result.data);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async generateConversationTitle(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const title = await ChatService.generateConversationTitle(userId, conversationId);
      
      res.status(200).json({
        success: true,
        message: 'Title generated successfully',
        data: { title }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ChatController();
