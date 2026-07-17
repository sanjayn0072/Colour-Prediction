import '../config/env.js';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.MYSQL_DATABASE || 'colourplay',
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306
});

const run = async () => {
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.query('SELECT id, uid, name, phone, email, role, status FROM users');
    console.log('Users in database:');
    console.log(users);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
