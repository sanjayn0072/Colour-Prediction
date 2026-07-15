import '../config/env.js';
import { pool } from '../config/db.js';

async function run() {
  const connection = await pool.getConnection();
  try {
    console.log("Wiping transactional table data to clear conflict state...");
    
    // Disable foreign key checks to truncate tables cleanly
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    
    const tablesToClear = [
      'bets',
      'game_rounds',
      'color_prediction_history',
      'dice_game_history',
      'wallet_transactions',
      'round_counters',
      'user_game_stats'
    ];

    for (const table of tablesToClear) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
      console.log(`Truncated table: ${table}`);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Database transactional tables wiped and synchronized successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to clear database transactional state:", err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

run();
