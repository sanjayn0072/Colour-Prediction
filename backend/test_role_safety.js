import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import assert from 'assert';

dotenv.config();

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET;

async function runTests() {
  console.log('=== STARTING ROLE SAFETY TESTS ===');

  // 1. Establish direct db connection for seeding
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306
  });

  const testAdminId = 999901;
  const testSuperAdminId = 999902;
  const testUserId = 1; // Pardeep exists in DB

  try {
    // Make sure test admin exists in DB
    const [existingAdmin] = await connection.query('SELECT id FROM users WHERE id = ?', [testAdminId]);
    if (existingAdmin.length === 0) {
      await connection.query(
        "INSERT INTO users (id, uid, name, phone, email, password_hash, role, status) VALUES (?, '999901', 'Test Admin', '+919999999901', 'admin@test.com', 'dummy_hash', 'admin', 'active')",
        [testAdminId]
      );
      console.log('Seeded test admin.');
    }
    const [existingAdminWallet] = await connection.query('SELECT id FROM wallets WHERE user_id = ?', [testAdminId]);
    if (existingAdminWallet.length === 0) {
      await connection.query("INSERT INTO wallets (user_id, balance, bonus_balance) VALUES (?, 1000.00, 0.00)", [testAdminId]);
      console.log('Seeded test admin wallet.');
    }

    // Make sure test super admin exists in DB
    const [existingSuper] = await connection.query('SELECT id FROM users WHERE id = ?', [testSuperAdminId]);
    if (existingSuper.length === 0) {
      await connection.query(
        "INSERT INTO users (id, uid, name, phone, email, password_hash, role, status) VALUES (?, '999902', 'Test Super Admin', '+919999999902', 'superadmin@test.com', 'dummy_hash', 'super_admin', 'active')",
        [testSuperAdminId]
      );
      console.log('Seeded test super admin.');
    }
    const [existingSuperWallet] = await connection.query('SELECT id FROM wallets WHERE user_id = ?', [testSuperAdminId]);
    if (existingSuperWallet.length === 0) {
      await connection.query("INSERT INTO wallets (user_id, balance, bonus_balance) VALUES (?, 1000.00, 0.00)", [testSuperAdminId]);
      console.log('Seeded test super admin wallet.');
    }

    // Make sure spin config with id 1 exists
    const [existingSpin] = await connection.query('SELECT id FROM spin_configs WHERE id = 1');
    if (existingSpin.length === 0) {
      await connection.query(
        "INSERT INTO spin_configs (id, prize_name, type, value, weight, is_active) VALUES (1, 'Test Prize', 'bonus', 5.0000, 100, 1)"
      );
      console.log('Seeded test spin config.');
    }

    // Make sure test coupon code 'TESTCOUPON10' is deleted before testing
    await connection.query("DELETE FROM coupons WHERE code = 'TESTCOUPON10'");
    console.log('Cleared existing test coupon if any.');

    // 2. Generate JWT tokens
    const userToken = jwt.sign({ id: testUserId }, JWT_SECRET);
    const adminToken = jwt.sign({ id: testAdminId }, JWT_SECRET);
    const superAdminToken = jwt.sign({ id: testSuperAdminId }, JWT_SECRET);

    console.log('Tokens generated successfully.');

    // Helper to send request
    const request = async (url, method, token, body = null) => {
      const headers = { 'Authorization': `Bearer ${token}` };
      if (body) {
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetch(`${API_BASE}${url}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
      let responseBody = null;
      try {
        responseBody = await response.json();
      } catch (err) {}
      return { status: response.status, body: responseBody };
    };

    // Test cases setup
    const testCases = [
      // 1. Users management
      { url: '/api/admin/users', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },
      { url: `/api/admin/users/${testUserId}/history`, method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },
      { url: `/api/admin/users/${testUserId}/status`, method: 'PUT', reqBody: { status: 'active' }, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },
      { url: `/api/admin/users/${testUserId}/balance`, method: 'PUT', reqBody: { amount: 10, balanceType: 'real', description: 'test' }, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },

      // 2. Orders management
      { url: '/api/admin/orders', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },

      // 3. Complaints
      { url: '/api/admin/complaints', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },

      // 4. Coupons
      { url: '/api/admin/coupons', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },
      { url: '/api/admin/coupons', method: 'POST', reqBody: { code: 'TESTCOUPON10', discountType: 'flat', value: 10, minDeposit: 100, maxUses: 5 }, expectedUser: 403, expectedAdmin: 403, expectedSuper: 201 },

      // 5. Spin configurations
      { url: '/api/admin/spin-configs', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },
      { url: '/api/admin/spin-configs/1', method: 'PUT', reqBody: { weight: 10, value: 5, isActive: true }, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },

      // 6. Games status
      { url: '/api/admin/games', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },
      { url: '/api/admin/games/1/status', method: 'PUT', reqBody: { isActive: true }, expectedUser: 403, expectedAdmin: 403, expectedSuper: 200 },

      // 7. Withdrawals
      { url: '/api/admin/withdrawals', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 200, expectedSuper: 200 },
      { url: '/api/admin/withdrawals/9999/approve', method: 'PUT', reqBody: {}, expectedUser: 403, expectedAdmin: 403, expectedSuper: 404 }, // 404 is correct since withdrawal ID 9999 doesn't exist, but it shows super admin bypassed 403

      // 8. Metrics & Logs
      { url: '/api/admin/metrics', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 200, expectedSuper: 200 },
      { url: '/api/admin/logs', method: 'GET', reqBody: null, expectedUser: 403, expectedAdmin: 200, expectedSuper: 200 },
    ];

    let passed = 0;
    let failed = 0;

    for (const tc of testCases) {
      console.log(`\nTesting ${tc.method} ${tc.url}...`);

      // Test User
      const userRes = await request(tc.url, tc.method, userToken, tc.reqBody);
      try {
        assert.strictEqual(userRes.status, tc.expectedUser, `User status should be ${tc.expectedUser}, got ${userRes.status}`);
        console.log(`  User: OK (Status ${userRes.status})`);
        passed++;
      } catch (err) {
        console.error(`  User: FAIL (${err.message})`);
        failed++;
      }

      // Test Admin
      const adminRes = await request(tc.url, tc.method, adminToken, tc.reqBody);
      try {
        assert.strictEqual(adminRes.status, tc.expectedAdmin, `Admin status should be ${tc.expectedAdmin}, got ${adminRes.status}`);
        console.log(`  Admin: OK (Status ${adminRes.status})`);
        passed++;
      } catch (err) {
        console.error(`  Admin: FAIL (${err.message})`);
        failed++;
      }

      // Test Super Admin
      const superRes = await request(tc.url, tc.method, superAdminToken, tc.reqBody);
      try {
        assert.strictEqual(superRes.status, tc.expectedSuper, `Super Admin status should be ${tc.expectedSuper}, got ${superRes.status}`);
        console.log(`  Super Admin: OK (Status ${superRes.status})`);
        passed++;
      } catch (err) {
        console.error(`  Super Admin: FAIL (${err.message})`);
        failed++;
      }
    }

    console.log(`\n=== ROLE SAFETY TEST SUMMARY ===`);
    console.log(`Passed checks: ${passed}`);
    console.log(`Failed checks: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test script crashed:', err);
    process.exit(1);
  } finally {
    // Cleanup coupons created in test (TESTCOUPON10)
    try {
      await connection.query("DELETE FROM coupons WHERE code = 'TESTCOUPON10'");
      console.log('Cleaned up test coupon.');
    } catch (e) {}

    // Cleanup test users and wallets
    try {
      await connection.query("DELETE FROM audit_logs WHERE admin_id IN (?, ?)", [testAdminId, testSuperAdminId]);
      await connection.query("DELETE FROM wallets WHERE user_id IN (?, ?)", [testAdminId, testSuperAdminId]);
      await connection.query("DELETE FROM users WHERE id IN (?, ?)", [testAdminId, testSuperAdminId]);
      console.log('Cleaned up test admin and super admin audit logs, users, and wallets.');
    } catch (e) {
      console.error('Failed to clean up test users/wallets:', e.message);
    }

    // Cleanup test spin config
    try {
      await connection.query("DELETE FROM spin_configs WHERE id = 1");
      console.log('Cleaned up test spin config.');
    } catch (e) {}

    await connection.end();
  }
}

runTests();
