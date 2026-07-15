import '../config/env.js';
import { pool } from '../config/db.js';

async function run() {
  const connection = await pool.getConnection();
  try {
    console.log("Checking columns of notifications table...");
    const [columns] = await connection.query("SHOW COLUMNS FROM notifications");
    const colNames = columns.map(c => c.Field);

    if (colNames.includes('notifications_type') && !colNames.includes('type')) {
      console.log("Renaming notifications_type to type...");
      await connection.query("ALTER TABLE notifications CHANGE COLUMN notifications_type type VARCHAR(50) NULL");
      console.log("Renamed successfully!");
    } else if (!colNames.includes('type')) {
      console.log("Adding type column...");
      await connection.query("ALTER TABLE notifications ADD COLUMN type VARCHAR(50) NULL");
      console.log("Added successfully!");
    } else {
      console.log("Column 'type' already exists on notifications table.");
    }
    process.exit(0);
  } catch (err) {
    console.error("Failed to alter notifications table:", err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

run();
