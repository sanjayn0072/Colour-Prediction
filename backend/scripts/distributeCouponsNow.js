import '../config/env.js';
import mysql from 'mysql2/promise';
import { evaluateAllUsers } from '../utils/rewardsWorker.js';


const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'colourplay'
});

const run = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Clearing all existing coupons from all accounts...');
    const [delRes] = await connection.query('DELETE FROM user_coupons');
    console.log(`✓ Deleted ${delRes.affectedRows} existing coupon allocations.`);

    console.log('Running behavioral sweeps engine to distribute coupons...');
    await evaluateAllUsers();
    console.log('✓ Distribution completed successfully!');
  } catch (err) {
    console.error('Failed to clear/distribute coupons:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
