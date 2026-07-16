import '../config/env.js';
import { pool } from '../config/db.js';

const alterIfsc = async () => {
  const connection = await pool.getConnection();

  try {
    console.log('Altering database columns in payment_methods table...');
    await connection.query('ALTER TABLE payment_methods MODIFY COLUMN ifsc_code VARCHAR(30) NULL');
    console.log('✓ Successfully altered ifsc_code to VARCHAR(30)');
  } catch (err) {
    console.error('Failed to alter columns:', err);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
};

alterIfsc();
