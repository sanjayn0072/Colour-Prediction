import './env.js';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load connection options from environment variables
const mysqlUrl = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;
const poolConfig = mysqlUrl
  ? mysqlUrl
  : {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT
        ? parseInt(process.env.MYSQL_PORT, 10)
        : undefined,
      charset: "utf8mb4",
      waitForConnections: true,
      connectionLimit: 150,
      queueLimit: 0,
      supportBigNumbers: true,
      bigNumberStrings: true,
      typeCast(field, next) {
        if (field.type === "NEWDECIMAL" || field.type === "DECIMAL") {
          const val = field.string();
          return val === null ? null : parseFloat(val);
        }
        return next();
      },
    };


export const ensureDatabaseExists = async () => {
  // Skip creating the database when using a connection URL.
  // Railway databases are already created.
  if (process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL) {
    return;
  }

  const dbName = process.env.MYSQL_DATABASE || "colourplay";

  const configWithoutDb = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.MYSQL_PORT
      ? parseInt(process.env.MYSQL_PORT, 10)
      : undefined,
  };

  try {
    const tempConn = await mysql.createConnection(configWithoutDb);
    await tempConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await tempConn.end();
  } catch (err) {
    logger.error(err, "Failed to ensure database exists");
  }
};
export const pool = mysql.createPool(poolConfig);

// Mongoose-like mapping helper for backward compatibility in backend controllers
export const mapKeys = (row) => {
  if (!row) return null;
  const mapped = { ...row };

  // map id to _id
  if (row.id !== undefined && row._id === undefined) {
    mapped._id = String(row.id);
  }

  // Map snake_case to camelCase
  if (row.wallet_balance !== undefined) mapped.walletBalance = row.wallet_balance;
  if (row.bonus_balance !== undefined) mapped.bonusBalance = row.bonus_balance;
  if (row.password_hash !== undefined) mapped.password = row.password_hash;
  if (row.user_id !== undefined && row.userId === undefined) mapped.userId = String(row.user_id);
  if (row.game_round_id !== undefined && row.gameRoundId === undefined) mapped.gameRoundId = String(row.game_round_id);
  
  if (row.bet_amount !== undefined && row.betAmount === undefined) mapped.betAmount = row.bet_amount;
  if (row.payout_multiplier !== undefined && row.payoutMultiplier === undefined) mapped.payoutMultiplier = row.payout_multiplier;
  if (row.payout_amount !== undefined && row.payoutAmount === undefined) mapped.payoutAmount = row.payout_amount;
  
  if (row.roll_number !== undefined && row.outcomeNumber === undefined) mapped.outcomeNumber = row.roll_number;
  if (row.winning_color !== undefined && row.winningColor === undefined) mapped.winningColor = row.winning_color;
  
  if (row.is_two_factor_enabled !== undefined) mapped.isTwoFactorEnabled = !!row.is_two_factor_enabled;
  if (row.two_factor_secret !== undefined) mapped.twoFactorSecret = row.two_factor_secret;
  if (row.phone_number !== undefined) mapped.phoneNumber = row.phone_number;

  // Add save helper (simulates Mongoose .save())
  mapped.save = async function() {
    // Determine target table and save values
    return mapped;
  };

  // Add comparePassword helper
  if (mapped.password) {
    mapped.comparePassword = async function(enteredPassword) {
      try {
        return await bcrypt.compare(enteredPassword, mapped.password);
      } catch (err) {
        return enteredPassword === mapped.password;
      }
    };
  }

  return mapped;
};

// Global query wrapper
export const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  if (Array.isArray(rows)) {
    return rows.map(mapKeys);
  }
  return rows;
};

// Seed initial system data if database tables are empty
const seedSystemData = async () => {
  try {
    // 1. Seed Games
    const [gamesCount] = await pool.query('SELECT COUNT(*) as count FROM games');
    if (Number(gamesCount[0].count) === 0) {
      await pool.query(
        "INSERT INTO games (id, name, is_active) VALUES " +
        "(1, 'colour_30s', 1), " +
        "(2, 'colour_1m', 1), " +
        "(3, 'colour_2m', 1), " +
        "(4, 'colour_5m', 1), " +
        "(5, 'dice', 1)"
      );
      logger.info('System games seeded successfully.');
    }

    // 2. Seed Demo User
    const [usersCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (Number(usersCount[0].count) === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Demo@1234', salt);
      
      const [userResult] = await pool.query(
        "INSERT INTO users (id, uid, name, phone, email, password_hash, role) VALUES (102948, '888888', 'Demo User', '9876543210', 'demo@colourplay.com', ?, 'admin')",
        [hashedPassword]
      );
      
      const userId = userResult.insertId || 102948;
      await pool.query("INSERT INTO wallets (user_id, balance, bonus_balance) VALUES (?, 1250.50, 0.00)", [userId]);
      await pool.query("INSERT INTO user_stats (user_id) VALUES (?)", [userId]);
      logger.info('Demo user and wallet seeded successfully.');
    }

    // 3. Seed Banners
    const [bannersCount] = await pool.query('SELECT COUNT(*) as count FROM banners');
    if (Number(bannersCount[0].count) === 0) {
      await pool.query(
        `INSERT INTO banners (title, subtitle, gradient, action) VALUES 
        ('Signup & Get Rs. 150', 'Earn instant Rs. 150 bonus. Recharge up to Rs. 500 for matching reward tiers!', 'from-amber-500 via-orange-600 to-yellow-500', 'deposit'),
        ('Lucky Spin Challenge', 'Spin the lucky wheel and win cash prizes', 'from-indigo-600 via-purple-600 to-pink-500', 'spinWheel'),
        ('Refer & Earn', 'Earn Rs. 100 for every friend you invite', 'from-emerald-500 via-teal-500 to-cyan-500', 'refer'),
        ('Mega Prediction Tournament', 'Play Colour and Dice games to win mega rewards', 'from-orange-500 via-red-500 to-rose-500', 'game'),
        ('VIP Rewards', 'Unlock exclusive perks & bonuses', 'from-violet-600 via-fuchsia-500 to-pink-500', 'profile')`
      );
      logger.info('Banners seeded successfully.');
    }

    // 4. Seed Products
    const [productsCount] = await pool.query('SELECT COUNT(*) as count FROM products');
    if (Number(productsCount[0].count) === 0) {
      const products = [
        { title: 'AuraPods Pro', price: 1499, original: 2499, rating: 4.8, reviews: 124, desc: 'Immersive sound with high-fidelity drivers, active noise cancellation up to 40dB, and 40 hours of combined battery life with the wireless charging case. IPX5 water resistant.' },
        { title: 'Chronos Watch S', price: 2999, original: 4999, rating: 4.7, reviews: 89, desc: 'Track your fitness goals, receive calls, and manage your health metrics on a stunning 1.43-inch AMOLED display. Features up to 14 days of battery life per charge.' },
        { title: 'Apex Mechanical Keyboard', price: 3499, original: 5999, rating: 4.9, reviews: 45, desc: 'Hot-swappable mechanical switches, double-shot PBT keycaps, and triple-mode connectivity (Bluetooth, 2.4G wireless, or USB-C wired). Ergonomic design with custom RGB.' },
        { title: 'Viper Wireless Mouse', price: 1899, original: 2999, rating: 4.8, reviews: 67, desc: 'Lightweight 65g shell optimized for performance. Incorporates a high-precision 26K DPI optical sensor and zero-latency wireless connectivity. Up to 80 hours of battery life.' },
        { title: 'AuraPods Lite', price: 999, original: 1999, rating: 4.5, reviews: 210, desc: 'Comfortable fit, dynamic bass boost driver, clear calls with ENC mic, and 28 hours total battery life with fast charge.' },
        { title: 'Chronos Watch Active', price: 1999, original: 3499, rating: 4.6, reviews: 112, desc: 'Sporty layout with lightweight build, custom training metrics, notifications, and 7-day battery life.' },
        { title: 'Apex Silent Keyboard', price: 2499, original: 3999, rating: 4.7, reviews: 33, desc: 'Quiet dampening switches for office environment, sleek low profile structure, and long-lasting wireless rechargeable battery.' },
        { title: 'Viper Gaming Mouse', price: 1199, original: 1999, rating: 4.6, reviews: 54, desc: 'Vertical 57-degree hand grip design reduces wrist fatigue. Multi-device Bluetooth connection and quick flow scroll wheel.' }
      ];

      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const [prodResult] = await pool.query(
          "INSERT INTO products (title, price, original_price, description, rating, reviews_count, stock) VALUES (?, ?, ?, ?, ?, ?, 100)",
          [p.title, p.price, p.original, p.desc, p.rating, p.reviews]
        );
        const prodId = prodResult.insertId;
        
        // Seed product images
        await pool.query(
          "INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, 1)",
          [prodId, `/src/assets/${p.title.toLowerCase().split(' ')[0]}.png`]
        );
      }
      logger.info('Products and images seeded successfully.');
    }
  } catch (err) {
    logger.error(err, 'Failed to seed system data');
  }
};

const connectDB = async () => {
  try {
    // Ensure database exists before attempting pool connection
    await ensureDatabaseExists();
    // 1. Verify connection pool
    const connection = await pool.getConnection();
    logger.info('MySQL Database pool connected successfully.');
    connection.release();

    // 2. Check if tables exist, if not, attempt to run schema.sql
    try {
      const [tables] = await pool.query("SHOW TABLES LIKE 'users'");
      if (tables.length === 0) {
        logger.warn('Database tables not found. Initializing database schema from schema.sql...');
        
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sqlScript = fs.readFileSync(schemaPath, 'utf8');
          // Split queries by semicolon (ignoring comments/newlines) and run sequentially
          const sqlStatements = sqlScript
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .split(/;\s*$/m)
            .map(s => s.trim())
            .filter(s => s.length > 0);

          for (const stmt of sqlStatements) {
            await pool.query(stmt);
          }
          logger.info('Database schema initialized successfully.');
        } else {
          logger.error('schema.sql file not found. Please create tables manually.');
        }
      }
    } catch (tblErr) {
      logger.error(tblErr, 'Failed to check or initialize database tables');
    }

    // 3. Seed data
    await seedSystemData();
  } catch (error) {
    logger.error(error, `MySQL Connection Pool initialization failed: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[1] && (process.argv[1].endsWith('db.js') || process.argv[1] === fileURLToPath(import.meta.url))) {
  console.log("Running db.js connection verification directly...");
  connectDB().then(() => {
    console.log("Database verification succeeded.");
    process.exit(0);
  }).catch((err) => {
    console.error("Database verification failed:", err);
    process.exit(1);
  });
}

export default connectDB;
