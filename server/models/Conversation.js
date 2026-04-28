const database = require('../config/database');

class Conversation {
  static async create(conversationData) {
    const { user_id, title, model_name } = conversationData;
    const sql = `
      INSERT INTO conversations (user_id, title, model_name)
      VALUES (?, ?, ?)
    `;
    
    try {
      const result = await database.run(sql, [user_id, title, model_name]);
      return await this.findById(result.id);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const sql = 'SELECT * FROM conversations WHERE id = ?';
    try {
      const conversations = await database.query(sql, [id]);
      return conversations[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(user_id, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM conversations 
      WHERE user_id = ? 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    try {
      return await database.query(sql, [user_id, limit, offset]);
    } catch (error) {
      throw error;
    }
  }

  static async update(id, conversationData) {
    const { title, model_name } = conversationData;
    const sql = `
      UPDATE conversations 
      SET title = ?, model_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      await database.run(sql, [title, model_name, id]);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM conversations WHERE id = ?';
    try {
      const result = await database.run(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getWithMessages(id) {
    const sql = `
      SELECT 
        c.*,
        m.id as message_id,
        m.role,
        m.content,
        m.tokens,
        m.created_at as message_created_at
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.id = ?
      ORDER BY m.created_at ASC
    `;
    try {
      const rows = await database.query(sql, [id]);
      if (rows.length === 0) return null;
      
      const conversation = {
        id: rows[0].id,
        user_id: rows[0].user_id,
        title: rows[0].title,
        model_name: rows[0].model_name,
        created_at: rows[0].created_at,
        updated_at: rows[0].updated_at,
        messages: []
      };
      
      rows.forEach(row => {
        if (row.message_id) {
          conversation.messages.push({
            id: row.message_id,
            role: row.role,
            content: row.content,
            tokens: row.tokens,
            created_at: row.message_created_at
          });
        }
      });
      
      return conversation;
    } catch (error) {
      throw error;
    }
  }

  static async getUserConversationStats(user_id) {
    const sql = `
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(DISTINCT model_name) as unique_models,
        MAX(updated_at) as last_activity
      FROM conversations 
      WHERE user_id = ?
    `;
    try {
      const result = await database.query(sql, [user_id]);
      return result[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Conversation;
