const database = require('../config/database');

class Message {
  static async create(messageData) {
    const { conversation_id, role, content, tokens = 0 } = messageData;
    const sql = `
      INSERT INTO messages (conversation_id, role, content, tokens)
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      const result = await database.run(sql, [conversation_id, role, content, tokens]);
      return await this.findById(result.id);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const sql = 'SELECT * FROM messages WHERE id = ?';
    try {
      const messages = await database.query(sql, [id]);
      return messages[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByConversationId(conversation_id, limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC 
      LIMIT ? OFFSET ?
    `;
    try {
      return await database.query(sql, [conversation_id, limit, offset]);
    } catch (error) {
      throw error;
    }
  }

  static async update(id, messageData) {
    const { content, tokens } = messageData;
    const sql = `
      UPDATE messages 
      SET content = ?, tokens = ?
      WHERE id = ?
    `;
    
    try {
      await database.run(sql, [content, tokens, id]);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM messages WHERE id = ?';
    try {
      const result = await database.run(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async deleteByConversationId(conversation_id) {
    const sql = 'DELETE FROM messages WHERE conversation_id = ?';
    try {
      const result = await database.run(sql, [conversation_id]);
      return result.changes;
    } catch (error) {
      throw error;
    }
  }

  static async getConversationTokenCount(conversation_id) {
    const sql = `
      SELECT 
        SUM(tokens) as total_tokens,
        COUNT(*) as message_count,
        SUM(CASE WHEN role = 'user' THEN tokens ELSE 0 END) as user_tokens,
        SUM(CASE WHEN role = 'assistant' THEN tokens ELSE 0 END) as assistant_tokens
      FROM messages 
      WHERE conversation_id = ?
    `;
    try {
      const result = await database.query(sql, [conversation_id]);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  static async getUserTokenStats(user_id) {
    const sql = `
      SELECT 
        SUM(m.tokens) as total_tokens,
        COUNT(m.id) as total_messages,
        SUM(CASE WHEN m.role = 'user' THEN m.tokens ELSE 0 END) as user_tokens,
        SUM(CASE WHEN m.role = 'assistant' THEN m.tokens ELSE 0 END) as assistant_tokens,
        COUNT(DISTINCT m.conversation_id) as conversation_count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ?
    `;
    try {
      const result = await database.query(sql, [user_id]);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  static async getRecentMessages(user_id, limit = 10) {
    const sql = `
      SELECT 
        m.*,
        c.title as conversation_title,
        c.model_name
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `;
    try {
      return await database.query(sql, [user_id, limit]);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Message;
