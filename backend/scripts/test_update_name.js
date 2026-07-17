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
    console.log('Original Super Admin details:');
    const [original] = await connection.query('SELECT id, name, role FROM users WHERE id = 1');
    console.log(original);

    console.log('Executing name update to "Super Admin Updated"...');
    const [result] = await connection.query('UPDATE users SET name = "Super Admin Updated" WHERE id = 1');
    console.log('Update result:', result);

    const [updated] = await connection.query('SELECT id, name, role FROM users WHERE id = 1');
    console.log('After update details:');
    console.log(updated);

    // Reset it back to original
    console.log('Resetting name back to "Super Admin"...');
    await connection.query('UPDATE users SET name = "Super Admin" WHERE id = 1');
  } catch (err) {
    console.error('Error during update test:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
