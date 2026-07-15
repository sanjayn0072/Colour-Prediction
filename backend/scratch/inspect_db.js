import '../config/env.js';
import { pool } from '../config/db.js';

async function inspect() {
  try {
    const [rows] = await pool.query("SHOW TABLES");
    console.log("Existing tables:", rows);
    process.exit(0);
  } catch (err) {
    console.error("Error inspecting database:", err);
    process.exit(1);
  }
}

inspect();
