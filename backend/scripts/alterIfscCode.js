import '../config/env.js';
import mysql from 'mysql2/promise';

const alterIfsc = async () => {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'colourplay',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10)
  });

  try {
    console.log('Altering database columns in payment_methods table...');
    await connection.query('ALTER TABLE payment_methods MODIFY COLUMN ifsc_code VARCHAR(30) NULL');
    console.log('✓ Successfully altered ifsc_code to VARCHAR(30)');
  } catch (err) {
    console.error('Failed to alter columns:', err);
  } finally {
    await connection.end();
  }
};

alterIfsc();
