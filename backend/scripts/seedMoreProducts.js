import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Kumar870@',
  database: process.env.DB_NAME || 'colourplay'
});

const run = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Seeding missing products...');
    const extraProducts = [
      { title: 'AuraPods Lite', price: 999, original: 1999, rating: 4.5, reviews: 210, desc: 'Comfortable fit, dynamic bass boost driver, clear calls with ENC mic, and 28 hours total battery life with fast charge.' },
      { title: 'Chronos Watch Active', price: 1999, original: 3499, rating: 4.6, reviews: 112, desc: 'Sporty layout with lightweight build, custom training metrics, notifications, and 7-day battery life.' },
      { title: 'Apex Silent Keyboard', price: 2499, original: 3999, rating: 4.7, reviews: 33, desc: 'Quiet dampening switches for office environment, sleek low profile structure, and long-lasting wireless rechargeable battery.' },
      { title: 'Viper Gaming Mouse', price: 1199, original: 1999, rating: 4.6, reviews: 54, desc: 'Vertical 57-degree hand grip design reduces wrist fatigue. Multi-device Bluetooth connection and quick flow scroll wheel.' }
    ];

    for (const p of extraProducts) {
      const [existing] = await connection.query('SELECT id FROM products WHERE title = ? LIMIT 1', [p.title]);
      if (existing.length === 0) {
        const [prodResult] = await connection.query(
          "INSERT INTO products (title, price, original_price, description, rating, reviews_count, stock) VALUES (?, ?, ?, ?, ?, ?, 100)",
          [p.title, p.price, p.original, p.desc, p.rating, p.reviews]
        );
        const prodId = prodResult.insertId;
        
        await connection.query(
          "INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, 1)",
          [prodId, `/src/assets/${p.title.toLowerCase().split(' ')[0]}.png`]
        );
        console.log(`✓ Seeded product: ${p.title}`);
      } else {
        console.log(`- Product already exists: ${p.title}`);
      }
    }
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
