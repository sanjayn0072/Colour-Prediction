import '../config/env.js';
import { pool } from '../config/db.js';

async function run() {
  const connection = await pool.getConnection();
  try {
    console.log("Creating deposit_appeals table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS deposit_appeals (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT UNSIGNED NOT NULL,
          deposit_id BIGINT UNSIGNED NULL,
          utr_number VARCHAR(100) NOT NULL,
          screenshot_url TEXT NULL,
          whatsapp_number VARCHAR(15) NULL,
          status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
          admin_note VARCHAR(500) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✓ deposit_appeals table created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to create deposit_appeals table:", err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

run();
