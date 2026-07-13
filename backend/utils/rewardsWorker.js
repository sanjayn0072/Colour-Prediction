import { query, pool } from '../config/db.js';
import logger from './logger.js';
import { createNotification } from './notifier.js';

/**
 * Evaluates active and inactive user activity to allocate retention/loyalty coupons.
 */
export const evaluateAllUsers = async () => {
  const connection = await pool.getConnection();
  try {
    logger.info('[Rewards Worker]: Starting behavioral rewards evaluation loop...');
    
    // Auto-expire old active user coupons first
    await connection.query(
      'UPDATE user_coupons SET status = "EXPIRED" WHERE status = "AVAILABLE" AND expires_at <= NOW()'
    );

    // Get all active users
    const [users] = await connection.query(
      'SELECT id, name FROM users WHERE status = "active"'
    );
    if (!users || users.length === 0) {
      logger.info('[Rewards Worker]: No active users found.');
      return;
    }

    // Load coupon definition IDs
    const [couponRows] = await connection.query(
      'SELECT id, code FROM coupons'
    );
    const couponMap = {};
    for (const row of couponRows) {
      couponMap[row.code] = row.id;
    }

    const getCouponId = (code) => couponMap[code] || null;

    for (const user of users) {
      const userId = user.id;

      // Helper to check if user already has an active instance of a coupon
      const checkHasActiveCoupon = async (couponCode) => {
        const [rows] = await connection.query(
          'SELECT id FROM user_coupons ' +
          'WHERE user_id = ? AND coupon_id = ? AND status = "AVAILABLE" AND expires_at > NOW() LIMIT 1',
          [userId, getCouponId(couponCode)]
        );
        return rows && rows.length > 0;
      };

      // Helper to award a coupon
      const awardCoupon = async (couponCode, validityDays, title, message) => {
        const couponId = getCouponId(couponCode);
        if (!couponId) return;

        const hasActive = await checkHasActiveCoupon(couponCode);
        if (hasActive) return; // Already has it

        await connection.query(
          'INSERT INTO user_coupons (user_id, coupon_id, status, expires_at) ' +
          'VALUES (?, ?, "AVAILABLE", DATE_ADD(NOW(), INTERVAL ? DAY))',
          [userId, couponId, validityDays]
        );

        await createNotification(
          userId,
          title,
          message,
          'COUPON',
          connection
        );
        logger.info(`[Rewards Worker]: Awarded ${couponCode} to user ID ${userId}`);
      };

      // 1. Fetch wagers & deposits in the last 7 days
      const [depositSumRow] = await connection.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE user_id = ? AND type = "deposit" AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
        [userId]
      );
      const totalDeposits = parseFloat(depositSumRow[0]?.total || 0);

      const [wagerSumRow] = await connection.query(
        'SELECT SUM(bet_amount) as total, COUNT(id) as count FROM bets WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
        [userId]
      );
      const totalWagers = parseFloat(wagerSumRow[0]?.total || 0);
      const betsCount = parseInt(wagerSumRow[0]?.count || 0);

      const [walletRow] = await connection.query(
        'SELECT balance FROM wallets WHERE user_id = ? LIMIT 1',
        [userId]
      );
      const walletBalance = parseFloat(walletRow[0]?.balance || 0);

      // Check Inactive status (no deposits and no bets in the last 14 days)
      const [recentActivity] = await connection.query(
        'SELECT (SELECT COUNT(id) FROM wallet_transactions WHERE user_id = ? AND type = "deposit" AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)) as dep_count, ' +
        '(SELECT COUNT(id) FROM bets WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)) as bet_count',
        [userId, userId]
      );
      const isInactive = parseInt(recentActivity[0]?.dep_count || 0) === 0 && parseInt(recentActivity[0]?.bet_count || 0) === 0;

      // Check active days (bets placed on distinct days in last 7 days)
      const [activeDaysRow] = await connection.query(
        'SELECT COUNT(DISTINCT DATE(created_at)) as active_days FROM bets WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
        [userId]
      );
      const activeDays = parseInt(activeDaysRow[0]?.active_days || 0);

      // --- EVALUATE TIERS ---

      // Tier 4: Inactive Reactivation
      if (isInactive) {
        await awardCoupon(
          'COMEBACK200',
          14,
          'Welcome Back Bonus!',
          'We miss you! Here is a special comeback coupon COMEBACK200. Deposit ₹1,000+ to claim ₹200 extra reward!'
        );
        continue; // skip other active rewards if they are inactive
      }

      // Tier 1: High Roller Deposit
      if (totalDeposits >= 5000) {
        await awardCoupon(
          'HIGHROLLER500',
          7,
          'High Roller Reload Bonus!',
          'Outstanding deposit activity! We awarded you coupon HIGHROLLER500. Deposit ₹5,000+ to claim ₹500 extra reward!'
        );
      }

      // Tier 2: High Volume Bettor
      if (totalWagers >= 10000) {
        await awardCoupon(
          'CASHBACK200',
          3,
          'Bettor Cashback Reward!',
          'Incredible wagering activity! Use coupon CASHBACK200 on your next deposit of ₹1,000+ to get a cashback reward of ₹200!'
        );
      }

      // Tier 5: Active Loyalty
      if (activeDays >= 5) {
        await awardCoupon(
          'ACTIVEPLAY50',
          3,
          'Weekly Loyalty Reward!',
          'Thank you for playing with us this week! Use coupon ACTIVEPLAY50 on a deposit of ₹300+ to get ₹50 extra reward!'
        );
      }

      // Tier 3: Frequent Player Retention Survival
      if (betsCount >= 50 && walletBalance < 100) {
        await awardCoupon(
          'SURVIVAL100',
          3,
          'Retention Survival Offer!',
          'Low balance survival match! Use coupon SURVIVAL100 on a deposit of ₹200+ to get ₹50 extra reward!'
        );
      }

      // Tier 6: Gameplay Freebie
      if (betsCount >= 200) {
        await awardCoupon(
          'FREEBET50',
          3,
          'Free Gameplay Bonus!',
          'Milestone reached! You played 200+ rounds. Claim a direct free bet bonus (no deposit required) under your Offers tab!'
        );
      }
    }

    logger.info('[Rewards Worker]: Behavioral evaluation completed successfully.');
  } catch (err) {
    logger.error(err, '[Rewards Worker Error]: Loop failed.');
  } finally {
    connection.release();
  }
};

/**
 * Starts the self-scheduling evaluation worker.
 */
export const startBehavioralRewardsWorker = () => {
  // Execute evaluation 10 seconds after startup so it doesn't throttle boot times
  setTimeout(() => {
    evaluateAllUsers().catch((err) => logger.error(err, 'Rewards worker failed on startup run'));
  }, 10000);

  // Set recurring evaluation loop once every 24 hours
  setInterval(() => {
    evaluateAllUsers().catch((err) => logger.error(err, 'Rewards worker failed on scheduled run'));
  }, 24 * 60 * 60 * 1000);

  logger.info('[Rewards Worker]: Behavioral rewards daemon scheduled successfully (Runs every 24 Hours).');
};
