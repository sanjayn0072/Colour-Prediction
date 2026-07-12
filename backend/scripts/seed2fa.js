import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
};

async function run() {
  console.log('Starting Admin 2FA database migration and seeding...');
  const conn = await mysql.createConnection(dbConfig);

  try {
    // 1. Alter users table to support role super_admin and 2FA columns
    console.log('Modifying users table columns...');
    
    // Check columns
    const [columns] = await conn.query('SHOW COLUMNS FROM users');
    const colNames = columns.map(c => c.Field);

    // Add phone_number if not exists
    if (!colNames.includes('phone_number')) {
      await conn.query('ALTER TABLE users ADD COLUMN phone_number VARCHAR(15) NULL');
      console.log('  Added phone_number column');
    }

    // Add is_two_factor_enabled if not exists
    if (!colNames.includes('is_two_factor_enabled')) {
      await conn.query('ALTER TABLE users ADD COLUMN is_two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0');
      console.log('  Added is_two_factor_enabled column');
    }

    // Add two_factor_secret if not exists
    if (!colNames.includes('two_factor_secret')) {
      await conn.query('ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) NULL');
      console.log('  Added two_factor_secret column');
    }

    // Alter role column ENUM to support super_admin
    await conn.query(`
      ALTER TABLE users MODIFY COLUMN role 
      ENUM('user', 'moderator', 'admin', 'super_admin') NOT NULL DEFAULT 'user'
    `);
    console.log('  Modified role ENUM to include super_admin');

    // 2. Generate and insert / update admin accounts
    const admins = [
      {
        phone: '9876543210',
        email: 'coloursupport@gmail.com',
        password: 'Rahul890@',
        role: 'admin',
        name: 'Master Admin'
      },
      {
        phone: '9466503764',
        email: '20092003pardeep@gmail.com',
        password: 'Kumar870@',
        role: 'super_admin',
        name: 'Master Super Admin'
      }
    ];

    for (const admin of admins) {
      console.log(`\nProcessing 2FA credentials for ${admin.name} (${admin.phone})...`);
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(admin.password, salt);

      // Check if user already exists
      const [existing] = await conn.query('SELECT id, uid FROM users WHERE phone = ? OR email = ? LIMIT 1', [admin.phone, admin.email]);
      
      let userId;
      let uid;

      // Generate TOTP Secret
      const secret = speakeasy.generateSecret({
        name: `ColourPlay:${admin.name} (${admin.phone})`,
        length: 20
      });

      if (existing.length > 0) {
        userId = existing[0].id;
        uid = existing[0].uid;
        
        // Update user
        await conn.query(
          `UPDATE users 
           SET name = ?, phone = ?, phone_number = ?, password_hash = ?, role = ?, is_two_factor_enabled = 0, two_factor_secret = ? 
           WHERE id = ?`,
          [admin.name, admin.phone, admin.phone, hashedPassword, admin.role, secret.base32, userId]
        );
        console.log(`  Updated existing user (id: ${userId}, uid: ${uid})`);
      } else {
        // Generate a random 6 digit UID
        uid = Math.floor(100000 + Math.random() * 900000).toString();
        const [result] = await conn.query(
          `INSERT INTO users (uid, name, phone, phone_number, email, password_hash, role, is_two_factor_enabled, two_factor_secret) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [uid, admin.name, admin.phone, admin.phone, admin.email, hashedPassword, admin.role, secret.base32]
        );
        userId = result.insertId;
        console.log(`  Created new user (id: ${userId}, uid: ${uid})`);

        // Seed wallet & stats
        await conn.query('INSERT IGNORE INTO wallets (user_id, balance, bonus_balance) VALUES (?, 0.00, 0.00)', [userId]);
        await conn.query('INSERT IGNORE INTO user_stats (user_id) VALUES (?)', [userId]);
        console.log('  Seeded wallet and user stats');
      }

      console.log(`  Secret Base32: ${secret.base32}`);
      console.log(`  Otpauth URL: ${secret.otpauth_url}`);
      
      // Print QR Code to console
      try {
        const qrString = await qrcode.toString(secret.otpauth_url, { type: 'terminal', small: true });
        console.log('  Scan this QR Code in Google Authenticator or Microsoft Authenticator app:\n');
        console.log(qrString);
      } catch (qrErr) {
        console.log('  Could not display QR code in terminal:', qrErr.message);
      }
    }

    console.log('\nMigration and Seeding completed successfully!');
  } catch (error) {
    console.error('Error during migration/seeding:', error);
  } finally {
    await conn.end();
  }
}

run();
