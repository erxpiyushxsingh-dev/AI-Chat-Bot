const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const OllamaService = require('./OllamaService');

class ChatService {
  constructor() {
    this.ollamaService = OllamaService;
  }

  async createConversation(userId, title, modelName) {
    try {
      const conversation = await Conversation.create({
        user_id: userId,
        title: title || 'New Conversation',
        model_name: modelName || process.env.DEFAULT_MODEL || 'llama2'
      });
      return conversation;
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  async sendMessage(userId, conversationId, userMessage, modelName = null) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      // Save user message first
      const userMessageData = await Message.create({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        tokens: this.ollamaService.estimateTokens(userMessage)
      });

      // Get all messages including the one we just saved
      const messages = await Message.findByConversationId(conversationId);
      const formattedMessages = this.ollamaService.formatMessagesForOllama(messages);

      // Use the provided model name or conversation's model, fallback to env default
      const modelToUse = modelName || conversation.model_name || process.env.DEFAULT_MODEL || 'phi3:mini';

      console.log(`Sending message to Ollama with model: ${modelToUse}`);
      console.log(`Message count: ${formattedMessages.length}`);

      const aiResponse = await this.ollamaService.chat(
        formattedMessages,
        modelToUse,
        {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 512
        }
      );

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'Failed to generate AI response');
      }

      // Save assistant message
      const assistantMessage = await Message.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.response,
        tokens: aiResponse.tokens || 0
      });

      // Update conversation with the model that was actually used
      await Conversation.update(conversationId, {
        title: conversation.title,
        model_name: modelToUse
      });

      return {
        success: true,
        userMessage: userMessageData,
        assistantMessage: assistantMessage,
        model: aiResponse.model,
        tokens: {
          user: userMessageData.tokens,
          assistant: assistantMessage.tokens,
          total: userMessageData.tokens + assistantMessage.tokens
        },
        metadata: {
          total_duration: aiResponse.total_duration,
          prompt_eval_count: aiResponse.prompt_eval_count,
          eval_count: aiResponse.eval_count
        }
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async sendMessageStream(userId, conversationId, userMessage, modelName = null, onChunk) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      // Save user message first
      const userMessageData = await Message.create({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        tokens: this.ollamaService.estimateTokens(userMessage)
      });

      // Get all messages including the one we just saved
      const messages = await Message.findByConversationId(conversationId);
      const formattedMessages = this.ollamaService.formatMessagesForOllama(messages);

      // Use the provided model name or conversation's model, fallback to env default
      const modelToUse = modelName || conversation.model_name || process.env.DEFAULT_MODEL || 'phi3:mini';

      console.log(`Starting streaming message to Ollama with model: ${modelToUse}`);

      const aiResponse = await this.ollamaService.chatStream(
        formattedMessages,
        modelToUse,
        {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 256 // Reduced for faster response
        },
        onChunk
      );

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'Failed to generate AI response');
      }

      // Save assistant message
      const assistantMessage = await Message.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.response,
        tokens: aiResponse.tokens || 0
      });

      // Update conversation with the model that was actually used
      await Conversation.update(conversationId, {
        title: conversation.title,
        model_name: modelToUse
      });

      return {
        success: true,
        userMessage: userMessageData,
        assistantMessage: assistantMessage,
        model: aiResponse.model,
        tokens: {
          user: userMessageData.tokens,
          assistant: assistantMessage.tokens,
          total: userMessageData.tokens + assistantMessage.tokens
        },
        metadata: {
          total_duration: aiResponse.total_duration,
          prompt_eval_count: aiResponse.prompt_eval_count,
          eval_count: aiResponse.eval_count
        }
      };
    } catch (error) {
      console.error('Error in sendMessageStream:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async getConversation(userId, conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      const fullConversation = await Conversation.getWithMessages(conversationId);
      return fullConversation;
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  async getUserConversations(userId, limit = 50, offset = 0) {
    try {
      const conversations = await Conversation.findByUserId(userId, limit, offset);
      const conversationsWithStats = await Promise.all(
        conversations.map(async (conv) => {
          const stats = await Message.getConversationTokenCount(conv.id);
          return {
            ...conv,
            message_count: stats.message_count,
            total_tokens: stats.total_tokens
          };
        })
      );
      return conversationsWithStats;
    } catch (error) {
      throw new Error(`Failed to get user conversations: ${error.message}`);
    }
  }

  async deleteConversation(userId, conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      await Message.deleteByConversationId(conversationId);
      const deleted = await Conversation.delete(conversationId);
      return deleted;
    } catch (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  async updateConversationTitle(userId, conversationId, title) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      const updatedConversation = await Conversation.update(conversationId, {
        title: title,
        model_name: conversation.model_name
      });
      return updatedConversation;
    } catch (error) {
      throw new Error(`Failed to update conversation title: ${error.message}`);
    }
  }

  async getChatStats(userId) {
    try {
      const conversationStats = await Conversation.getUserConversationStats(userId);
      const tokenStats = await Message.getUserTokenStats(userId);
      
      return {
        conversations: conversationStats,
        tokens: tokenStats,
        recent_activity: await Message.getRecentMessages(userId, 5)
      };
    } catch (error) {
      throw new Error(`Failed to get chat stats: ${error.message}`);
    }
  }

  async searchConversations(userId, query, limit = 20) {
    try {
      const conversations = await Conversation.findByUserId(userId, 100, 0);
      const filteredConversations = conversations.filter(conv => 
        conv.title.toLowerCase().includes(query.toLowerCase())
      );

      const conversationsWithMessages = await Promise.all(
        filteredConversations.slice(0, limit).map(async (conv) => {
          const fullConv = await Conversation.getWithMessages(conv.id);
          const matchingMessages = fullConv.messages.filter(msg =>
            msg.content.toLowerCase().includes(query.toLowerCase())
          );
          
          return {
            ...conv,
            matching_messages: matchingMessages.length,
            total_messages: fullConv.messages.length
          };
        })
      );

      return conversationsWithMessages.sort((a, b) => b.matching_messages - a.matching_messages);
    } catch (error) {
      throw new Error(`Failed to search conversations: ${error.message}`);
    }
  }

  async exportConversation(userId, conversationId, format = 'json') {
    try {
      const conversation = await this.getConversation(userId, conversationId);
      
      if (format === 'json') {
        return {
          success: true,
          data: conversation,
          filename: `conversation_${conversationId}_${Date.now()}.json`
        };
      } else if (format === 'txt') {
        const textContent = conversation.messages.map(msg => 
          `[${msg.role.toUpperCase()}] ${msg.content}`
        ).join('\n\n');
        
        return {
          success: true,
          data: textContent,
          filename: `conversation_${conversationId}_${Date.now()}.txt`
        };
      } else {
        throw new Error('Unsupported export format');
      }
    } catch (error) {
      throw new Error(`Failed to export conversation: ${error.message}`);
    }
  }

  async generateConversationTitle(userId, conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }

      const messages = await Message.findByConversationId(conversationId, 3, 0);
      if (messages.length === 0) {
        return 'New Conversation';
      }

      const firstUserMessage = messages.find(msg => msg.role === 'user');
      if (!firstUserMessage) {
        return 'New Conversation';
      }

      const titlePrompt = `Generate a short, descriptive title (max 5 words) for this conversation based on the first message: "${firstUserMessage.content.substring(0, 100)}..."`;
      
      const aiResponse = await this.ollamaService.generateResponse(
        titlePrompt,
        conversation.model_name,
        { temperature: 0.3, max_tokens: 50 }
      );

      if (aiResponse.success) {
        const title = aiResponse.response.trim().replace(/['"]/g, '').substring(0, 50);
        await this.updateConversationTitle(userId, conversationId, title);
        return title;
      }

      return firstUserMessage.content.substring(0, 30).trim() + '...';
    } catch (error) {
      throw new Error(`Failed to generate title: ${error.message}`);
    }
  }
}

module.exports = new ChatService();
