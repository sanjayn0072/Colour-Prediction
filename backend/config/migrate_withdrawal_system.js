import './env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 });

import connectDB, { pool } from './db.js';
import logger from '../utils/logger.js';

const runMigration = async () => {
  await connectDB();
  const connection = await pool.getConnection();
  try {
    logger.info('--- Starting Withdrawal Management System Database Migration ---');

    // 1. Add processed_by_admin_id column
    const [cols] = await connection.query('SHOW COLUMNS FROM withdrawals');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('processed_by_admin_id')) {
      logger.info('Adding processed_by_admin_id column...');
      await connection.query('ALTER TABLE withdrawals ADD COLUMN processed_by_admin_id BIGINT UNSIGNED NULL AFTER user_id');
      await connection.query('ALTER TABLE withdrawals ADD FOREIGN KEY (processed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL');
    } else {
      logger.info('processed_by_admin_id column already exists.');
    }

    // 2. Add rejection_reason column
    if (!colNames.includes('rejection_reason')) {
      logger.info('Adding rejection_reason column...');
      await connection.query('ALTER TABLE withdrawals ADD COLUMN rejection_reason TEXT NULL AFTER utr_number');
    } else {
      logger.info('rejection_reason column already exists.');
    }

    // 3. Modify status enum to include PROCESSING
    logger.info('Modifying status enum column to include PROCESSING...');
    await connection.query(`
      ALTER TABLE withdrawals MODIFY COLUMN status ENUM('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'PAID') NOT NULL DEFAULT 'PENDING'
    `);

    // 4. Add unique constraint on utr_number
    logger.info('Cleaning up empty strings in utr_number to NULL...');
    await connection.query(`
      UPDATE withdrawals SET utr_number = NULL WHERE TRIM(utr_number) = '' OR utr_number = ''
    `);

    logger.info('Adding unique constraint on utr_number...');
    const [indexes] = await connection.query('SHOW INDEX FROM withdrawals');
    const indexNames = indexes.map(idx => idx.Key_name);

    if (!indexNames.includes('uq_withdrawals_utr')) {
      await connection.query('ALTER TABLE withdrawals ADD CONSTRAINT uq_withdrawals_utr UNIQUE (utr_number)');
    } else {
      logger.info('Unique constraint uq_withdrawals_utr already exists.');
    }

    logger.info('✅ Database migration successful: Withdrawal Management System updated!');
    process.exit(0);
  } catch (err) {
    logger.error(err, '❌ Migration failed');
    process.exit(1);
  } finally {
    connection.release();
  }
};

runMigration();
