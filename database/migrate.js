const database = require('../server/config/database');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    console.log('Starting database migration...');
    await database.connect();
    console.log('Database migration completed successfully!');
    await database.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function seed() {
  try {
    console.log('Starting database seeding...');
    await database.connect();
    
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password123', saltRounds);
    
    await database.run(
      'INSERT OR IGNORE INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      ['testuser', 'test@example.com', passwordHash]
    );
    
    console.log('✓ Created test user: test@example.com / password123');
    
    await database.run(
      'INSERT OR IGNORE INTO conversations (user_id, title, model_name) VALUES (?, ?, ?)',
      [1, 'Welcome Conversation', 'llama2']
    );
    
    console.log('✓ Created sample conversation');
    
    await database.run(
      'INSERT OR IGNORE INTO messages (conversation_id, role, content, tokens) VALUES (?, ?, ?, ?)',
      [1, 'user', 'Hello! Can you help me with something?', 10]
    );
    
    await database.run(
      'INSERT OR IGNORE INTO messages (conversation_id, role, content, tokens) VALUES (?, ?, ?, ?)',
      [1, 'assistant', 'Of course! I\'m here to help. What would you like to know?', 15]
    );
    
    console.log('✓ Created sample messages');
    
    console.log('Database seeding completed successfully!');
    await database.close();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

async function reset() {
  try {
    console.log('Starting database reset...');
    await database.connect();
    
    await database.run('DELETE FROM messages');
    await database.run('DELETE FROM conversations');
    await database.run('DELETE FROM users');
    
    console.log('✓ Cleared all data');
    console.log('Database reset completed successfully!');
    await database.close();
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

const command = process.argv[2];

if (command === 'migrate') {
  migrate();
} else if (command === 'seed') {
  seed();
} else if (command === 'reset') {
  reset();
} else {
  console.log('Usage: node migrate.js [migrate|seed|reset]');
  console.log('  migrate  - Create database tables');
  console.log('  seed     - Insert sample data');
  console.log('  reset    - Clear all data');
  process.exit(1);
}
