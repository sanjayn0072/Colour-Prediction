import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'colourplay'
});

const run = async () => {
  try {
    // Get user ID 1 from DB
    const [users] = await pool.query('SELECT id, name, phone FROM users WHERE id = 1');
    if (!users.length) { console.log('No user found'); return; }
    const user = users[0];
    console.log(`User: ${user.name} (ID: ${user.id})`);

    // Generate a JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey123', { expiresIn: '1h' });
    console.log('Token generated.');

    // Call the deposit endpoint
    console.log('Calling POST /api/payment/create with amount=200...');
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:5000/api/payment/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount: 200 }),
      signal: AbortSignal.timeout(15000)
    });

    const elapsed = Date.now() - startTime;
    console.log(`Response received in ${elapsed}ms`);
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await pool.end();
  }
};

run();
