import './env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables

import connectDB, { pool } from './db.js';
import logger from '../utils/logger.js';

const runMigration = async () => {
  await connectDB();
  const connection = await pool.getConnection();
  try {
    logger.info('--- Starting Wallet & Bets Columns DDL Migration ---');

    // 1. Alter wallets table
    const [walletColumns] = await connection.query('SHOW COLUMNS FROM wallets');
    const walletColNames = walletColumns.map(col => col.Field);

    if (!walletColNames.includes('locked_balance')) {
      await connection.query('ALTER TABLE wallets ADD COLUMN locked_balance DECIMAL(15, 4) NOT NULL DEFAULT 0.0000 AFTER balance');
      logger.info('Added locked_balance column to wallets table.');
    } else {
      logger.info('locked_balance column already exists in wallets table.');
    }

    if (!walletColNames.includes('required_wager')) {
      await connection.query('ALTER TABLE wallets ADD COLUMN required_wager DECIMAL(15, 4) NOT NULL DEFAULT 0.0000 AFTER bonus_balance');
      logger.info('Added required_wager column to wallets table.');
    } else {
      logger.info('required_wager column already exists in wallets table.');
    }

    // 2. Alter bets table
    const [betColumns] = await connection.query('SHOW COLUMNS FROM bets');
    const betColNames = betColumns.map(col => col.Field);

    if (!betColNames.includes('real_used')) {
      await connection.query('ALTER TABLE bets ADD COLUMN real_used DECIMAL(15, 4) NOT NULL DEFAULT 0.0000 AFTER bet_amount');
      logger.info('Added real_used column to bets table.');
    } else {
      logger.info('real_used column already exists in bets table.');
    }

    if (!betColNames.includes('bonus_used')) {
      await connection.query('ALTER TABLE bets ADD COLUMN bonus_used DECIMAL(15, 4) NOT NULL DEFAULT 0.0000 AFTER real_used');
      logger.info('Added bonus_used column to bets table.');
    } else {
      logger.info('bonus_used column already exists in bets table.');
    }

    // 3. Migrate any existing locked_balance from users to wallets
    // Check if users has locked_balance
    const [userColumns] = await connection.query('SHOW COLUMNS FROM users');
    const userColNames = userColumns.map(col => col.Field);

    if (userColNames.includes('locked_balance')) {
      await connection.query(
        'UPDATE wallets w JOIN users u ON w.user_id = u.id SET w.locked_balance = u.locked_balance WHERE u.locked_balance > 0'
      );
      logger.info('Migrated existing user locked_balance to wallets table.');
    }

    logger.info('--- Wallet & Bets Columns Migration completed successfully! ---');
    process.exit(0);
  } catch (err) {
    logger.error(err, 'DDL Migration failed');
    process.exit(1);
  } finally {
    connection.release();
  }
};

runMigration();
