import '../config/env.js';
import mysql from 'mysql2/promise';


const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'colourplay'
});

const run = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Adding payment_url column to deposits table...');
    await connection.query('ALTER TABLE deposits ADD COLUMN payment_url TEXT NULL');
    console.log('✓ Column added successfully!');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ Column already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
