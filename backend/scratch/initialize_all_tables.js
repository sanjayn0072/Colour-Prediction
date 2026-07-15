import '../config/env.js';
import { pool } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const schemaPath = path.resolve(__dirname, '../config/schema.sql');
    const sqlScript = fs.readFileSync(schemaPath, 'utf8');

    // Split queries by semicolon (ignoring comments/newlines) and run sequentially
    const sqlStatements = sqlScript
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const connection = await pool.getConnection();
    console.log("Connected to database successfully. Running statements...");

    for (let stmt of sqlStatements) {
      // Skip CREATE DATABASE or USE statements
      if (stmt.toUpperCase().startsWith("CREATE DATABASE") || stmt.toUpperCase().startsWith("USE ")) {
        console.log("Skipping database configuration statement:", stmt.split('\n')[0]);
        continue;
      }

      // Convert CREATE TABLE to CREATE TABLE IF NOT EXISTS
      if (stmt.toUpperCase().startsWith("CREATE TABLE ")) {
        const afterCreateTable = stmt.substring(13);
        if (!afterCreateTable.toUpperCase().startsWith("IF NOT EXISTS")) {
          stmt = "CREATE TABLE IF NOT EXISTS " + afterCreateTable;
        }
      }

      try {
        await connection.query(stmt);
        console.log("Executed statement successfully:", stmt.split('\n')[0]);
      } catch (queryErr) {
        console.error("Failed to execute statement:", stmt.split('\n')[0]);
        console.error(queryErr.message);
      }
    }

    connection.release();
    console.log("Completed running schema statements.");
    process.exit(0);
  } catch (err) {
    console.error("Initialization script failed:", err);
    process.exit(1);
  }
}

run();
