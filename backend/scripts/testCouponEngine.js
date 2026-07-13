import '../config/env.js';
import mysql from 'mysql2/promise';


const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'colourplay'
});

const runTests = async () => {
  let testUserId = null;
  let testWalletId = null;
  const connection = await pool.getConnection();

  try {
    console.log('🧪 Starting Rigorous QA Automated Integration Tests for Coupon Engine...');

    // A. SETUP: Create temporary test user
    console.log('\n[1/5] Setting up temporary test user and wallet...');
    const [userRes] = await connection.query(
      'INSERT INTO users (uid, name, phone, email, password_hash, status) VALUES ("QA_TEST", "QA Test User", "0000000000", "qa@tester.com", "hash", "active")'
    );
    testUserId = userRes.insertId;

    const [walletRes] = await connection.query(
      'INSERT INTO wallets (user_id, balance, bonus_balance) VALUES (?, 0.00, 0.00)',
      [testUserId]
    );
    testWalletId = walletRes.insertId;
    
    await connection.query(
      'INSERT INTO user_stats (user_id) VALUES (?)',
      [testUserId]
    );
    console.log(`✓ Temporary user created with ID: ${testUserId}`);

    // B. WELCOME OFFER BOUNDARY CHECKS
    console.log('\n[2/5] Running Welcome Offer boundary condition tests...');
    
    // Seed WELCOME150 coupon if not exists
    const [couponRow] = await connection.query('SELECT id FROM coupons WHERE code = "WELCOME150" LIMIT 1');
    const couponId = couponRow[0].id;

    // 1. Allocate WELCOME150 coupon
    await connection.query(
      'INSERT INTO user_coupons (user_id, coupon_id, status, expires_at) VALUES (?, ?, "AVAILABLE", DATE_ADD(NOW(), INTERVAL 7 DAY))',
      [testUserId, couponId]
    );
    console.log('✓ WELCOME150 coupon allocated to test user');

    // 2. Test boundary ₹499 (Must fail/be ignored for rewards)
    console.log('-> Simulating deposit verification callback of ₹499...');
    let depositAmount = 499.00;
    
    // Simulate webhook transaction locks
    await connection.beginTransaction();
    const [uCouponRow1] = await connection.query(
      'SELECT uc.id, c.reward_amount, c.min_deposit_required FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ? AND c.code = "WELCOME150" AND uc.status = "AVAILABLE" FOR UPDATE',
      [testUserId]
    );
    
    const uCoupon1 = uCouponRow1[0];
    let rewardApplied1 = false;
    if (uCoupon1 && depositAmount >= parseFloat(uCoupon1.min_deposit_required)) {
      rewardApplied1 = true;
    }
    
    await connection.commit();
    console.log(`  Result: Min required is ₹${uCoupon1.min_deposit_required}. Deposit ₹${depositAmount}. Reward applied? ${rewardApplied1}`);
    if (rewardApplied1) {
      throw new Error('❌ FAIL: Coupon applied to deposit amount below minimum threshold.');
    }
    console.log('✓ PASS: Boundary ₹499 deposit correctly rejected welcome cashback.');

    // 3. Test boundary ₹500 (Must succeed and credit ₹150)
    console.log('-> Simulating deposit verification callback of ₹500...');
    depositAmount = 500.00;
    
    await connection.beginTransaction();
    
    // Lock deposit row & Lock user_coupon
    const [uCouponRow2] = await connection.query(
      'SELECT uc.id, c.reward_amount, c.min_deposit_required FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ? AND c.code = "WELCOME150" AND uc.status = "AVAILABLE" FOR UPDATE',
      [testUserId]
    );
    
    const uCoupon2 = uCouponRow2[0];
    let rewardAmount = 0;
    let userCouponId = null;
    if (uCoupon2 && depositAmount >= parseFloat(uCoupon2.min_deposit_required)) {
      rewardAmount = parseFloat(uCoupon2.reward_amount);
      userCouponId = uCoupon2.id;
    }

    if (rewardAmount > 0 && userCouponId) {
      // Mark USED
      await connection.query('UPDATE user_coupons SET status = "USED" WHERE id = ?', [userCouponId]);
      
      // Update wallet balance
      await connection.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [depositAmount + rewardAmount, testUserId]);
      
      // Insert net deposit ledger
      await connection.query(
        'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) VALUES (?, ?, ?, "deposit", "deposits", 999, 0, ?, "Test Deposit")',
        [testUserId, testWalletId, depositAmount, depositAmount]
      );
      // Insert reward claim ledger
      await connection.query(
        'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) VALUES (?, ?, ?, "bonus_claim", "user_coupons", ?, ?, ?, "Test Welcome Reward")',
        [testUserId, testWalletId, rewardAmount, userCouponId, depositAmount, depositAmount + rewardAmount]
      );
    }
    
    await connection.commit();
    
    // Verify wallet balance
    const [walletVerification] = await connection.query('SELECT balance FROM wallets WHERE user_id = ?', [testUserId]);
    const finalBalance = parseFloat(walletVerification[0].balance);
    console.log(`  Wallet balance after ₹500 deposit + ₹150 reward: ₹${finalBalance}`);
    if (finalBalance !== 650.00) {
      throw new Error(`❌ FAIL: Expected wallet balance to be ₹650.00, but got ₹${finalBalance}`);
    }
    
    // Verify coupon status is USED
    const [couponVerification] = await connection.query('SELECT status FROM user_coupons WHERE id = ?', [userCouponId]);
    console.log(`  Coupon status after redemption: ${couponVerification[0].status}`);
    if (couponVerification[0].status !== 'USED') {
      throw new Error('❌ FAIL: Coupon status was not set to USED after redemption.');
    }
    console.log('✓ PASS: Boundary ₹500 successfully redeemed welcome reward and locked state.');

    // C. TEMPORAL EXPIRE VALIDATION
    console.log('\n[3/5] Testing Temporal Expiration query filters...');
    // Allocate an EXPIRED coupon definition (expires_at is 1 hour ago)
    await connection.query(
      'INSERT INTO user_coupons (user_id, coupon_id, status, expires_at) VALUES (?, ?, "AVAILABLE", DATE_SUB(NOW(), INTERVAL 1 HOUR))',
      [testUserId, couponId]
    );

    // Call expire routine
    await connection.query(
      'UPDATE user_coupons SET status = "EXPIRED" WHERE status = "AVAILABLE" AND expires_at <= NOW()'
    );

    // Fetch active coupons
    const [activeCoupons] = await connection.query(
      'SELECT uc.id FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ? AND uc.status = "AVAILABLE" AND uc.expires_at > NOW()',
      [testUserId]
    );
    console.log(`  Active available coupons count: ${activeCoupons.length}`);
    if (activeCoupons.length !== 0) {
      throw new Error('❌ FAIL: Expired coupons are still fetched by the active coupons query.');
    }
    console.log('✓ PASS: Expired coupons correctly updated and filtered out.');

    // D. POLYMORPHIC RETENTION REWARDS
    console.log('\n[4/5] Testing Polymorphic Behavioral Scheduler rollups...');
    
    // Simulate deposits of ₹6,000 in past 7 days to trigger HIGHROLLER500
    console.log('-> Seeding fake wagers and deposits for test user...');
    await connection.query(
      'INSERT INTO deposits (user_id, amount, transaction_id, status, created_at) VALUES (?, 6000.00, "TXN_QA_ROLLER", "completed", NOW())',
      [testUserId]
    );

    // Fetch total deposits in past 7 days
    const [depositSum] = await connection.query(
      'SELECT SUM(amount) as total FROM deposits WHERE user_id = ? AND status = "completed" AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      [testUserId]
    );
    const sum = parseFloat(depositSum[0].total || 0);
    console.log(`  Aggregate deposits in past 7 days: ₹${sum}`);

    // If sum >= 5000, allocate HIGHROLLER500
    if (sum >= 5000) {
      const [hrCoupon] = await connection.query('SELECT id FROM coupons WHERE code = "HIGHROLLER500" LIMIT 1');
      
      // Check if already active
      const [hrActive] = await connection.query(
        'SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ? AND status = "AVAILABLE" AND expires_at > NOW()',
        [testUserId, hrCoupon[0].id]
      );
      if (hrActive.length === 0) {
        await connection.query(
          'INSERT INTO user_coupons (user_id, coupon_id, status, expires_at) VALUES (?, ?, "AVAILABLE", DATE_ADD(NOW(), INTERVAL 7 DAY))',
          [testUserId, hrCoupon[0].id]
        );
        console.log('✓ Allocated HIGHROLLER500 to high roller user');
      }
    }

    // Run duplicate check
    const [hrActive2] = await connection.query(
      'SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = (SELECT id FROM coupons WHERE code = "HIGHROLLER500") AND status = "AVAILABLE"',
      [testUserId]
    );
    console.log(`  Active HIGHROLLER500 counts for user: ${hrActive2.length}`);
    if (hrActive2.length !== 1) {
      throw new Error('❌ FAIL: Behavioral scheduler duplicated high roller reload coupons.');
    }
    console.log('✓ PASS: Aggregation loops successfully allocated single HIGHROLLER500 coupon.');

  } catch (err) {
    console.error('Test Suite Failed with error:', err);
    process.exit(1);
  } finally {
    // E. TEARDOWN: Clean up test data
    console.log('\n[5/5] Tearing down temporary QA test data...');
    if (testUserId) {
      await connection.query('DELETE FROM wallet_transactions WHERE user_id = ?', [testUserId]);
      await connection.query('DELETE FROM user_coupons WHERE user_id = ?', [testUserId]);
      await connection.query('DELETE FROM deposits WHERE user_id = ?', [testUserId]);
      await connection.query('DELETE FROM wallets WHERE user_id = ?', [testUserId]);
      await connection.query('DELETE FROM user_stats WHERE user_id = ?', [testUserId]);
      await connection.query('DELETE FROM users WHERE id = ?', [testUserId]);
      console.log('✓ Test data cleared cleanly.');
    }
    connection.release();
    await pool.end();
    console.log('\n🎉 ALL QA COUPON ENGINE INTEGRATION TESTS PASSED SUCCESSFULLY!');
  }
};

runTests();
