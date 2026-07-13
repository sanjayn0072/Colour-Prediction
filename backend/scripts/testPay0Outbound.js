import axios from 'axios';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { decryptConfigValue } from '../utils/configEncryption.js';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'colourplay'
});

const run = async () => {
  const connection = await pool.getConnection();
  try {
    const [configs] = await connection.query(
      'SELECT config_value FROM system_configs WHERE config_key = "PAY0_USER_TOKEN" LIMIT 1'
    );
    const userToken = decryptConfigValue(configs[0]?.config_value) || process.env.PAY0_USER_TOKEN;
    console.log('Using User Token:', userToken ? 'Found (hidden)' : 'Not Found');

    const uniqueAmount = 100.23;
    const orderId = `TEST-DEP-${Date.now()}`;
    const redirectUrl = 'http://localhost:5000';
    const webhookUrl = 'http://localhost:5000';

    const formData = new URLSearchParams();
    formData.append('customer_mobile', '9999999999');
    formData.append('customer_name', 'RRClub Player');
    formData.append('user_token', userToken || '');
    formData.append('amount', String(uniqueAmount));
    formData.append('order_id', orderId);
    formData.append('redirect_url', redirectUrl);
    formData.append('webhook_url', webhookUrl);

    console.log('Sending request to Pay0 API...');
    const response = await axios.post('https://pay0.shop/api/create-order', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });
    console.log('Response Status:', response.status);
    console.log('Response Data:', response.data);

  } catch (err) {
    console.error('Outbound Request Failed:', err.message);
    if (err.response) {
      console.error('Response Data:', err.response.data);
    }
  } finally {
    connection.release();
    await pool.end();
  }
};

run();
