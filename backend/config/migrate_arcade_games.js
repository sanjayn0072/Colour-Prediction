import './env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB, { pool } from './db.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 });

const runMigration = async () => {
  await connectDB();
  const connection = await pool.getConnection();
  try {
    logger.info('--- Starting Arcade Games Database Migration ---');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS arcade_games (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          game_id VARCHAR(50) NOT NULL UNIQUE,
          game_name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL UNIQUE,
          script_url TEXT NULL,
          global_name VARCHAR(100) NOT NULL,
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('Created arcade_games table (or it already existed).');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS arcade_bets (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT UNSIGNED NOT NULL,
          arcade_game_id BIGINT UNSIGNED NOT NULL,
          bet_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
          payout_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
          status ENUM('pending', 'win', 'lose', 'cancelled') NOT NULL DEFAULT 'pending',
          game_metadata JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (arcade_game_id) REFERENCES arcade_games(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('Created arcade_bets table (or it already existed).');

    // Insert initial game configurations
    await connection.query(`
      INSERT INTO arcade_games (game_id, game_name, slug, script_url, global_name, status)
      VALUES 
      ('aviator', 'Aviator', 'aviator', 'https://game-modules.colourplay.com/aviator.js', 'AviatorModule', 'active'),
      ('mines', 'Mines', 'mines', 'https://game-modules.colourplay.com/mines.js', 'MinesModule', 'active')
      ON DUPLICATE KEY UPDATE game_name = VALUES(game_name)
    `);
    logger.info('Inserted initial decoupled game configurations.');
    logger.info('--- Arcade Games Migration Completed Successfully ---');
  } catch (err) {
    logger.error(err, 'Migration failed');
  } finally {
    connection.release();
    await pool.end();
  }
};

runMigration();
