import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'colourplay'
});

const seedCoupons = async () => {
  try {
    console.log('Starting Coupon Engine Database migrations...');

    // 1. Alter deposits table to add coupon_code if missing
    try {
      await pool.query('ALTER TABLE deposits ADD COLUMN coupon_code VARCHAR(50) NULL');
      console.log('✓ Added coupon_code column to deposits table');
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ coupon_code column already exists on deposits table');
      } else {
        throw err;
      }
    }

    // 2. Alter coupons table to add new columns if missing
    const alterColumns = [
      "MODIFY COLUMN discount_type ENUM('flat', 'percentage') NOT NULL DEFAULT 'flat'",
      "MODIFY COLUMN value DECIMAL(15, 4) NOT NULL DEFAULT 0.0000",
      "ADD COLUMN type ENUM('FIRST_DEPOSIT', 'RETENTION_REWARD', 'GAMEPLAY_FREEBIE', 'FEE_WAIVER', 'REACTIVATION', 'LOYALTY') NOT NULL DEFAULT 'RETENTION_REWARD'",
      "ADD COLUMN reward_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000",
      "ADD COLUMN min_deposit_required DECIMAL(15, 4) NOT NULL DEFAULT 0.0000",
      "ADD COLUMN validity_days INT NOT NULL DEFAULT 7"
    ];

    for (const statement of alterColumns) {
      try {
        await pool.query(`ALTER TABLE coupons ${statement}`);
        console.log(`✓ Executed column alter: ${statement.split(' ')[2]}`);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME') {
          // Already exists
        } else {
          throw err;
        }
      }
    }

    // 3. Create user_coupons table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        coupon_id BIGINT UNSIGNED NOT NULL,
        status ENUM('AVAILABLE', 'USED', 'EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
        allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    console.log('✓ user_coupons table created or verified');

    // Create index
    try {
      await pool.query('CREATE INDEX idx_user_coupons_user_status ON user_coupons(user_id, status)');
      console.log('✓ Created index on user_coupons(user_id, status)');
    } catch (err) {
      // index already exists
    }

    // 4. Seed coupons matrix
    const couponsToSeed = [
      { code: 'WELCOME150', type: 'FIRST_DEPOSIT', reward: 150, min_dep: 500, days: 7 },
      { code: 'HIGHROLLER500', type: 'RETENTION_REWARD', reward: 500, min_dep: 5000, days: 7 },
      { code: 'CASHBACK200', type: 'RETENTION_REWARD', reward: 200, min_dep: 1000, days: 3 },
      { code: 'SURVIVAL100', type: 'RETENTION_REWARD', reward: 50, min_dep: 200, days: 3 },
      { code: 'LOYALTY250', type: 'LOYALTY', reward: 250, min_dep: 1500, days: 5 },
      { code: 'WEEKEND50', type: 'RETENTION_REWARD', reward: 50, min_dep: 300, days: 2 },
      { code: 'RELOAD999', type: 'RETENTION_REWARD', reward: 999, min_dep: 10000, days: 7 },
      { code: 'FREEWITHDRAW', type: 'FEE_WAIVER', reward: 0, min_dep: 0, days: 30 },
      { code: 'FREEBET50', type: 'GAMEPLAY_FREEBIE', reward: 30, min_dep: 0, days: 3 },
      { code: 'COMEBACK200', type: 'REACTIVATION', reward: 200, min_dep: 1000, days: 14 },
      { code: 'ACTIVEPLAY50', type: 'LOYALTY', reward: 50, min_dep: 300, days: 3 }
    ];

    console.log('Seeding coupons definitions...');
    for (const c of couponsToSeed) {
      await pool.query(`
        INSERT INTO coupons (code, type, reward_amount, min_deposit_required, validity_days)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          type = ?, 
          reward_amount = ?, 
          min_deposit_required = ?, 
          validity_days = ?
      `, [c.code, c.type, c.reward, c.min_dep, c.days, c.type, c.reward, c.min_dep, c.days]);
      console.log(`- Seeded coupon code: ${c.code}`);
    }

    console.log('✓ Coupon Engine Database Migrations & Seeding Complete!');
  } catch (err) {
    console.error('Fatal Error during Coupon migrations:', err);
  } finally {
    await pool.end();
  }
};

seedCoupons();
