const database = require('../config/database');

class User {
  static async create(userData) {
    const { username, email, password_hash } = userData;
    const sql = `
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `;
    
    try {
      const result = await database.run(sql, [username, email, password_hash]);
      return await this.findById(result.id);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    try {
      const users = await database.query(sql, [id]);
      return users[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    try {
      const users = await database.query(sql, [email]);
      return users[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByUsername(username) {
    const sql = 'SELECT * FROM users WHERE username = ?';
    try {
      const users = await database.query(sql, [username]);
      return users[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, userData) {
    const { username, email } = userData;
    const sql = `
      UPDATE users 
      SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      await database.run(sql, [username, email, id]);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    try {
      const result = await database.run(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getAll(limit = 50, offset = 0) {
    const sql = `
      SELECT id, username, email, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    try {
      return await database.query(sql, [limit, offset]);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
