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
    console.log('Altering deposit_appeals table...');
    
    // Add deposit_id column if not exists
    const [cols] = await connection.query('SHOW COLUMNS FROM deposit_appeals');
    const hasDepositId = cols.some(c => c.Field === 'deposit_id');
    const hasAdminNote = cols.some(c => c.Field === 'admin_note');

    if (!hasDepositId) {
      await connection.query('ALTER TABLE deposit_appeals ADD COLUMN deposit_id BIGINT UNSIGNED NULL DEFAULT NULL');
      await connection.query('ALTER TABLE deposit_appeals ADD CONSTRAINT fk_appeals_deposit FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE SET NULL');
      console.log('✓ Added deposit_id column and foreign key constraint.');
    } else {
      console.log('✓ deposit_id column already exists.');
    }

    if (!hasAdminNote) {
      await connection.query('ALTER TABLE deposit_appeals ADD COLUMN admin_note VARCHAR(500) NULL DEFAULT NULL');
      console.log('✓ Added admin_note column.');
    } else {
      console.log('✓ admin_note column already exists.');
    }

  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
