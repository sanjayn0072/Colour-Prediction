import '../config/env.js';
import { pool } from '../config/db.js';

async function run() {
  const connection = await pool.getConnection();
  try {
    console.log("Creating missing tables...");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS round_counters (
          game_code VARCHAR(10) PRIMARY KEY,
          date_string VARCHAR(15) NOT NULL,
          last_counter INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Created table round_counters successfully.");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_configs (
          config_key VARCHAR(100) PRIMARY KEY,
          config_value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Created table system_configs successfully.");

    // Seed default configurations
    const defaultConfigs = [
      ["TRAFFIC_THRESHOLD_AMOUNT", "500"],
      ["GAME_SETTINGS", '{"min_bet":10,"max_bet":100000}'],
      ["SYSTEM_MAINTENANCE_STATE", "false"],
      ["COLOUR_MULTIPLIER_GREEN", "2.0"],
      ["COLOUR_MULTIPLIER_VIOLET", "4.5"],
      ["COLOUR_MULTIPLIER_RED", "2.0"],
      ["DICE_HOUSE_FEE", "2.0"]
    ];

    for (const [key, value] of defaultConfigs) {
      await connection.query(
        "INSERT INTO system_configs (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)",
        [key, value]
      );
      console.log(`Seeded configuration: ${key} = ${value}`);
    }

    console.log("All missing tables created and seeded successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to create missing tables:", err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

run();
