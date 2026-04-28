const database = require('../config/database');

class TrainingData {
  static async create(trainingData) {
    const { user_id, name, description, data_type, content } = trainingData;
    const sql = `
      INSERT INTO training_data (user_id, name, description, data_type, content)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await database.run(sql, [user_id, name, description, data_type, content]);
      return await this.findById(result.id);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const sql = 'SELECT * FROM training_data WHERE id = ?';
    try {
      const data = await database.query(sql, [id]);
      return data[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(user_id, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM training_data 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    try {
      return await database.query(sql, [user_id, limit, offset]);
    } catch (error) {
      throw error;
    }
  }

  static async findByStatus(status, limit = 50, offset = 0) {
    const sql = `
      SELECT * FROM training_data 
      WHERE status = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    try {
      return await database.query(sql, [status, limit, offset]);
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    const { name, description, content, status } = updateData;
    const sql = `
      UPDATE training_data 
      SET name = ?, description = ?, content = ?, status = ?
      WHERE id = ?
    `;
    
    try {
      await database.run(sql, [name, description, content, status, id]);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(id, status) {
    const sql = 'UPDATE training_data SET status = ? WHERE id = ?';
    try {
      await database.run(sql, [status, id]);
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM training_data WHERE id = ?';
    try {
      const result = await database.run(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  static async getByDataType(data_type, user_id = null) {
    let sql = 'SELECT * FROM training_data WHERE data_type = ?';
    let params = [data_type];
    
    if (user_id) {
      sql += ' AND user_id = ?';
      params.push(user_id);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    try {
      return await database.query(sql, params);
    } catch (error) {
      throw error;
    }
  }

  static async getTrainingStats(user_id = null) {
    let sql = `
      SELECT 
        COUNT(*) as total_datasets,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_datasets,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_datasets,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_datasets,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_datasets,
        COUNT(DISTINCT data_type) as unique_types
      FROM training_data
    `;
    let params = [];
    
    if (user_id) {
      sql += ' WHERE user_id = ?';
      params.push(user_id);
    }
    
    try {
      const result = await database.query(sql, params);
      return result[0];
    } catch (error) {
      throw error;
    }
  }

  static async getReadyForTraining() {
    const sql = `
      SELECT * FROM training_data 
      WHERE status = 'completed' 
      ORDER BY created_at DESC
    `;
    try {
      return await database.query(sql);
    } catch (error) {
      throw error;
    }
  }

  static async getContentForTraining(data_type, limit = 1000) {
    const sql = `
      SELECT content, name 
      FROM training_data 
      WHERE data_type = ? AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT ?
    `;
    try {
      return await database.query(sql, [data_type, limit]);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = TrainingData;
