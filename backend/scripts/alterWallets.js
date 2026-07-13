import '../config/env.js';
import mysql from 'mysql2/promise';


const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'colourplay'
});

const alterWallets = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Starting wallets table schema updates...');

    // 1. Add required_bonus_wager column if missing
    try {
      await connection.query('ALTER TABLE wallets ADD COLUMN required_bonus_wager DECIMAL(15, 2) NOT NULL DEFAULT 0.00');
      console.log('✓ Added required_bonus_wager column to wallets table');
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ required_bonus_wager column already exists on wallets table');
      } else {
        throw err;
      }
    }

    // 2. Modify other balance columns to DECIMAL(15,2)
    const modifications = [
      'MODIFY COLUMN balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00',
      'MODIFY COLUMN bonus_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00',
      'MODIFY COLUMN required_wager DECIMAL(15, 2) NOT NULL DEFAULT 0.00'
    ];

    for (const mod of modifications) {
      await connection.query(`ALTER TABLE wallets ${mod}`);
      console.log(`✓ Executed modification: ${mod}`);
    }

    console.log('✓ wallets table schema updates completed successfully!');
  } catch (err) {
    console.error('Fatal error during wallets alteration:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

alterWallets();
