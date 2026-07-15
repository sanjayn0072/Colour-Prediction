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
    logger.info('--- Starting Risk Alerts & User Status Enum Database Migration ---');

    console.log('Altering users status enum column to include locked...');
    await connection.query(`
      ALTER TABLE users MODIFY COLUMN status ENUM('active', 'suspended', 'inactive', 'locked') NOT NULL DEFAULT 'active';
    `);

    console.log('Creating admin_risk_alerts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_risk_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        trigger_type VARCHAR(50) NOT NULL, -- 'velocity_betting', 'payout_spike', 'consecutive_wins'
        risk_score INT NOT NULL, -- 0 to 100
        details TEXT NULL,
        is_resolved TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_risk_alerts_user (user_id),
        INDEX idx_risk_alerts_created (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    logger.info('✅ Database migration successful: users status altered and admin_risk_alerts created!');
    process.exit(0);
  } catch (err) {
    logger.error(err, '❌ Migration failed');
    process.exit(1);
  } finally {
    connection.release();
  }
};

runMigration();
