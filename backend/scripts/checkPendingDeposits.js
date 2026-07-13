import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'colourplay'
});

const run = async () => {
  try {
    // Check all pending deposits
    const [pending] = await pool.query(
      `SELECT id, user_id, amount, transaction_id, status, created_at 
       FROM deposits WHERE status = 'pending' 
       ORDER BY created_at DESC LIMIT 20`
    );
    console.log(`\nTotal pending deposits: ${pending.length}`);
    pending.forEach(d => {
      console.log(`  ID:${d.id} | User:${d.user_id} | ₹${d.amount} | TxnID: ${d.transaction_id} | Status: ${d.status} | Created: ${d.created_at}`);
    });

    // Check recent (last 30 seconds) pending deposits for user 1
    const [recent] = await pool.query(
      `SELECT id, amount, transaction_id, created_at FROM deposits 
       WHERE user_id = 1 AND status = 'pending' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND)`
    );
    console.log(`\nRecent pending deposits (last 30s) for user 1: ${recent.length}`);
    recent.forEach(d => {
      console.log(`  ID:${d.id} | ₹${d.amount} | TxnID: ${d.transaction_id} | Created: ${d.created_at}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
};

run();
