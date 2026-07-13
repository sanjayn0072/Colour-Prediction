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
    const [columns] = await connection.query('SHOW COLUMNS FROM wallets');
    console.log('Columns in wallets:');
    console.log(columns);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
