const pool = require('./db');
const { createTables } = require('./models');

async function initDb() {
  try {
    await pool.query(createTables);
    console.log('Tables created or already exist.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  }
}

initDb(); 