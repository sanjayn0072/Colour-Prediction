import './env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
 });

import connectDB, { pool } from './db.js';
import logger from '../utils/logger.js';

const runMigration = async () => {
  await connectDB();
  const connection = await pool.getConnection();
  try {
    logger.info('--- Starting Withdrawal System Database Migration ---');

    // 1. Add available_balance and locked_balance columns to users table if they do not exist
    const [userColumns] = await connection.query('SHOW COLUMNS FROM users');
    const columnNames = userColumns.map(col => col.Field);

    if (!columnNames.includes('available_balance')) {
      await connection.query('ALTER TABLE users ADD COLUMN available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
      logger.info('Added available_balance column to users table.');
    } else {
      logger.info('available_balance column already exists in users table.');
    }

    if (!columnNames.includes('locked_balance')) {
      await connection.query('ALTER TABLE users ADD COLUMN locked_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
      logger.info('Added locked_balance column to users table.');
    } else {
      logger.info('locked_balance column already exists in users table.');
    }

    // Initialize available_balance for existing users (like the demo user)
    await connection.query('UPDATE users SET available_balance = 1250.50 WHERE phone = "9876543210" AND available_balance = 0.00');
    logger.info('Initialized available_balance for the demo user.');

    // 2. Drop the old withdrawals table and recreate it with the new specifications
    // Wait, first drop foreign keys if any are referencing it. There are none.
    await connection.query('DROP TABLE IF EXISTS withdrawals');
    logger.info('Dropped old withdrawals table (if existed).');

    const createWithdrawalsTable = `
      CREATE TABLE withdrawals (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        withdrawal_id VARCHAR(50) NOT NULL UNIQUE,
        user_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('UPI', 'BANK') NOT NULL,
        upi_id VARCHAR(100) NULL,
        account_holder_name VARCHAR(100) NULL,
        account_number VARCHAR(30) NULL,
        ifsc_code VARCHAR(15) NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID') NOT NULL DEFAULT 'PENDING',
        utr_number VARCHAR(50) NULL,
        admin_note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `;
    await connection.query(createWithdrawalsTable);
    logger.info('Created new withdrawals table successfully.');

    // 3. Create indices for faster searching
    await connection.query('CREATE INDEX idx_withdrawals_status ON withdrawals(status)');
    await connection.query('CREATE INDEX idx_withdrawals_user ON withdrawals(user_id)');
    await connection.query('CREATE INDEX idx_withdrawals_id ON withdrawals(withdrawal_id)');
    logger.info('Created indices for withdrawals table.');

    logger.info('--- Migration completed successfully! ---');
    process.exit(0);
  } catch (err) {
    logger.error(err, 'Migration failed');
    process.exit(1);
  } finally {
    connection.release();
  }
};

runMigration();
