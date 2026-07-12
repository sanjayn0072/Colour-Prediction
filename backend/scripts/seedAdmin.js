import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const seedAdmin = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'colourplay'
  });

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Rahul890@.', salt);

    // Note: The prompt asked for "isEmailVerified: 1" but the users table doesn't have an isEmailVerified field.
    // If the system relies on 'status' = 'active', we're setting that.
    const [result] = await pool.query(
      `INSERT INTO users (uid, name, phone, email, password_hash, role, status) 
       VALUES ('ADMIN001', 'Admin', '9467029857', 'coloursupport@gmail.com', ?, 'admin', 'active')
       ON DUPLICATE KEY UPDATE password_hash = ?, role = 'admin', name = 'Admin', phone = '9467029857'`,
      [hashedPassword, hashedPassword]
    );

    console.log('Admin seeded successfully:', result);
    
    // Create wallet row if it's a new insert
    if (result.insertId) {
      await pool.query('INSERT IGNORE INTO wallets (user_id, balance, bonus_balance) VALUES (?, 0.00, 0.00)', [result.insertId]);
      await pool.query('INSERT IGNORE INTO user_stats (user_id) VALUES (?)', [result.insertId]);
      console.log('Admin wallet and stats created.');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  } finally {
    pool.end();
  }
};

seedAdmin();
