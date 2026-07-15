import '../config/env.js';
import { pool } from '../config/db.js';

async function run() {
  const connection = await pool.getConnection();
  try {
    console.log("Checking data existence in database tables...\n");

    const tablesToCheck = [
      'users',
      'wallets',
      'user_stats',
      'games',
      'banners',
      'products',
      'product_images',
      'coupons',
      'system_configs'
    ];

    for (const table of tablesToCheck) {
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) as count FROM \`${table}\``);
        console.log(`Table \`${table}\`: ${rows[0].count} rows found`);
      } catch (err) {
        console.error(`Error reading table \`${table}\`:`, err.message);
      }
    }

    console.log("\nSample Configurations in `system_configs`:");
    try {
      const [configs] = await connection.query("SELECT config_key, config_value FROM system_configs LIMIT 5");
      console.log(configs);
    } catch (err) {
      console.error("Could not fetch system_configs sample:", err.message);
    }

    console.log("\nSample Users in `users`:");
    try {
      const [users] = await connection.query("SELECT id, name, phone, email, role, status FROM users LIMIT 3");
      console.log(users);
    } catch (err) {
      console.error("Could not fetch users sample:", err.message);
    }

    console.log("\nSample Coupons in `coupons`:");
    try {
      const [coupons] = await connection.query("SELECT code, type, reward_amount FROM coupons LIMIT 5");
      console.log(coupons);
    } catch (err) {
      console.error("Could not fetch coupons sample:", err.message);
    }

    process.exit(0);
  } catch (err) {
    console.error("Database data check failed:", err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

run();
