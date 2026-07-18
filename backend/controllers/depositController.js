import axios from 'axios';
import { query, pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { createNotification } from '../utils/notifier.js';
import { decryptConfigValue } from '../utils/configEncryption.js';
import { sendAdminAlert } from '../utils/telegram.js';

export const getCouponSplit = (code, rewardAmount, depositAmount = 0) => {
  const cleanCode = String(code).trim().toUpperCase();
  let cashReward = 0;
  let bonusReward = 0;

  if (cleanCode === 'WELCOME150') {
    cashReward = 150.00;
    bonusReward = 0.00;
  } else if (cleanCode === 'HIGHROLLER500') {
    cashReward = 300.00; // 60% of 500
    bonusReward = 200.00; // 40% of 500
  } else if (cleanCode === 'CASHBACK200') {
    cashReward = 140.00; // 70% of 200
    bonusReward = 60.00; // 30% of 200
  } else if (cleanCode === 'SURVIVAL100') {
    cashReward = 25.00;
    bonusReward = 25.00;
  } else if (cleanCode === 'FREEBET50') {
    cashReward = 0.00;
    // Random claim from ₹5 to ₹30 Free Bonus
    bonusReward = Math.floor(Math.random() * 26) + 5;
  } else if (cleanCode === 'COMEBACK200') {
    cashReward = 120.00; // 60% of 200
    bonusReward = 80.00; // 40% of 200
  } else if (cleanCode === 'ACTIVEPLAY50') {
    cashReward = 45.00; // 90% of 50
    bonusReward = 5.00; // 10% of 50
  } else if (cleanCode === 'LOYALTY250') {
    cashReward = 162.50; // 65% of 250
    bonusReward = 87.50; // 35% of 250
  } else if (cleanCode === 'WEEKEND50') {
    cashReward = 37.50; // 75% of 50
    bonusReward = 12.50; // 25% of 50
  } else if (cleanCode === 'RELOAD999') {
    cashReward = 549.45; // 55% of 999
    bonusReward = 449.55; // 45% of 999
  } else if (cleanCode === 'LUCKY5') {
    cashReward = 0.05 * parseFloat(depositAmount || 0);
    bonusReward = 0.00;
  } else if (cleanCode === 'LUCKY10') {
    cashReward = 0.10 * parseFloat(depositAmount || 0);
    bonusReward = 0.00;
  } else if (cleanCode === 'LUCKY15') {
    cashReward = 0.15 * parseFloat(depositAmount || 0);
    bonusReward = 0.00;
  } else {
    // Default fallback: 100% bonus
    cashReward = 0.00;
    bonusReward = parseFloat(rewardAmount || 0);
  }

  return {
    cashReward: parseFloat(cashReward.toFixed(2)),
    bonusReward: parseFloat(bonusReward.toFixed(2))
  };
};

export const releaseCouponForDeposit = async (db, depositId) => {
  const [mapping] = await db.query(
    'SELECT user_coupon_id FROM deposit_coupons WHERE deposit_id = ? AND status = "LOCKED" FOR UPDATE',
    [depositId]
  );
  if (mapping && mapping.length > 0) {
    const userCouponId = mapping[0].user_coupon_id;
    await db.query(
      'UPDATE deposit_coupons SET status = "RELEASED" WHERE deposit_id = ?',
      [depositId]
    );
    await db.query(
      'UPDATE user_coupons SET status = "AVAILABLE" WHERE id = ?',
      [userCouponId]
    );
    logger.info(`[Coupon Lifecycle]: Released coupon ID ${userCouponId} for deposit ID ${depositId}`);
  }
};

/**
 * Phase 1 & Phase 3: Outbound Deposit Execution Engine with Unique Decimals
 * POST /api/payment/create
 */
export const createDeposit = async (req, res) => {
  const startTime = Date.now();
  const { amount: targetBaseAmount, couponCode } = req.body;

  if (!targetBaseAmount || isNaN(targetBaseAmount)) {
    return res.status(400).json({ error: 'Deposit amount is required and must be a valid number.' });
  }

  const baseAmount = parseFloat(targetBaseAmount);
  if (baseAmount < 100 || baseAmount > 50000) {
    return res.status(400).json({ error: 'Deposit amount must be between ₹100 and ₹50,000.' });
  }

  let uniqueAmount;
  let orderId;
  let userToken;
  let webhookUrl;
  let redirectUrl;
  let depositId = null;
  let userCouponId = null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Strict row lock to check for recent pending deposits in the last 3 minutes
    const [recentPending] = await connection.query(
      'SELECT id, amount, transaction_id, payment_url FROM deposits ' +
      'WHERE user_id = ? AND status = "pending" AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MINUTE) ' +
      'LIMIT 1 FOR UPDATE',
      [req.user.id]
    );

    if (recentPending && recentPending.length > 0) {
      let existing = recentPending[0];
      
      // Sleep loop to allow concurrent gateway requests to populate the URL (handles React double-mounts)
      let checkAttempts = 0;
      while (!existing.payment_url && checkAttempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const [checkAgain] = await connection.query(
          'SELECT id, amount, transaction_id, payment_url FROM deposits WHERE id = ?',
          [existing.id]
        );
        if (checkAgain && checkAgain.length > 0) {
          existing = checkAgain[0];
        }
        checkAttempts++;
      }

      if (existing.payment_url) {
        await connection.rollback();
        logger.info(`[Pay0 Recovery]: Recovering active pending payment URL for order ${existing.transaction_id}`);
        return res.json({
          success: true,
          payment_url: existing.payment_url,
          amount: parseFloat(existing.amount),
          orderId: existing.transaction_id,
          recovered: true
        });
      }

      // If sleep loop exhausted and still no URL, the previous request is orphaned/abandoned.
      // Mark it as failed so we can proceed to create a fresh order for the user.
      logger.warn(`[Pay0 Orphan Cleanup]: Pending deposit ${existing.transaction_id} has no payment_url after ${checkAttempts} retries. Marking as failed and creating new order.`);
      await connection.query(
        'UPDATE deposits SET status = "failed" WHERE id = ? AND status = "pending"',
        [existing.id]
      );
      // Release coupon associated with this failed orphaned deposit
      await releaseCouponForDeposit(connection, existing.id);
      // Fall through to create a brand new deposit order below
    }

    // 2. Validate coupon code if applied
    if (couponCode) {
      const [validCoupons] = await connection.query(
        'SELECT uc.id, c.id as couponId, c.min_deposit_required, c.monthly_limit ' +
        'FROM user_coupons uc ' +
        'JOIN coupons c ON uc.coupon_id = c.id ' +
        'WHERE uc.user_id = ? AND c.code = ? AND uc.status = "AVAILABLE" AND uc.expires_at > NOW() LIMIT 1 FOR UPDATE',
        [req.user.id, couponCode.trim().toUpperCase()]
      );
      if (!validCoupons || validCoupons.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'This coupon code is invalid, expired, or already used.' });
      }
      const coupon = validCoupons[0];

      // Enforce monthly claims limit in current calendar month
      const [usageCheck] = await connection.query(
        'SELECT COUNT(*) as monthlyClaims FROM user_coupons WHERE coupon_id = ? AND status = "USED" AND MONTH(allocated_at) = MONTH(NOW()) AND YEAR(allocated_at) = YEAR(NOW())',
        [coupon.couponId]
      );
      const monthlyClaims = usageCheck[0]?.monthlyClaims || 0;
      if (monthlyClaims >= coupon.monthly_limit) {
        await connection.rollback();
        return res.status(400).json({ error: 'This coupon has reached its monthly claim limit.' });
      }

      if (baseAmount < parseFloat(coupon.min_deposit_required)) {
        await connection.rollback();
        return res.status(400).json({ error: `This coupon requires a minimum deposit of ₹${coupon.min_deposit_required}.` });
      }
      userCouponId = coupon.id;
      // Lock the user coupon immediately
      await connection.query(
        'UPDATE user_coupons SET status = "LOCKED" WHERE id = ?',
        [userCouponId]
      );
    }

    // 3. Fetch Pay0 user token from database
    const [configs] = await connection.query(
      'SELECT config_value FROM system_configs WHERE config_key = "PAY0_USER_TOKEN" LIMIT 1'
    );
    userToken = decryptConfigValue(configs[0]?.config_value) || process.env.PAY0_USER_TOKEN;
    
    if (!userToken) {
      await connection.rollback();
      logger.warn('[Pay0 Integration]: User token is empty.');
      return res.status(400).json({ error: 'The deposit gateway is temporarily unavailable. Please contact support.' });
    }

    // 4. Unique Decimal Rule
    let deviation = -Math.random();
    uniqueAmount = parseFloat((baseAmount + deviation).toFixed(2));
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      const [existing] = await connection.query(
        'SELECT id FROM deposits WHERE status = "pending" AND amount = ? LIMIT 1',
        [uniqueAmount]
      );
      if (existing && existing.length > 0) {
        deviation = -Math.random();
        uniqueAmount = parseFloat((baseAmount + deviation).toFixed(2));
        attempts++;
      } else {
        isUnique = true;
      }
    }

    orderId = `RR-DEP-${Date.now()}`;

    // 5. Save pending transaction in deposits
    const [paymentMethods] = await connection.query(
      'SELECT id FROM payment_methods WHERE type = "upi" LIMIT 1'
    );
    const paymentMethodId = paymentMethods[0]?.id || null;

    const [insertResult] = await connection.query(
      'INSERT INTO deposits (user_id, payment_method_id, amount, transaction_id, status, coupon_code) VALUES (?, ?, ?, ?, "pending", ?)',
      [req.user.id, paymentMethodId, uniqueAmount, orderId, couponCode ? couponCode.trim().toUpperCase() : null]
    );
    depositId = insertResult.insertId;

    if (couponCode && userCouponId) {
      await connection.query(
        'INSERT INTO deposit_coupons (deposit_id, user_coupon_id, status) VALUES (?, ?, "LOCKED")',
        [depositId, userCouponId]
      );
    }

    // 6. Fetch webhook config URLs
    const [webhookConfigs] = await connection.query(
      'SELECT config_key, config_value FROM system_configs WHERE config_key IN ("PAY0_WEBHOOK_URL", "PAY0_REDIRECT_URL")'
    );
    const configMap = {};
    webhookConfigs.forEach(row => { configMap[row.config_key] = decryptConfigValue(row.config_value); });

    // Statically resolve the Railway backend URL for webhook target to prevent vercel-to-vercel loopbacks
    webhookUrl = configMap['PAY0_WEBHOOK_URL'];
    if (!webhookUrl || webhookUrl.includes('vercel.app')) {
      webhookUrl = 'https://colour-prediction-production.up.railway.app/api/payment/webhook';
    }

    // Redirect target resolves back to the React client UI on Vercel
    redirectUrl = configMap['PAY0_REDIRECT_URL'] || 'https://colour-prediction-blush.vercel.app/#/wallet?tab=deposit';

    // Commit transaction immediately to release locks before calling outbound payment gateway
    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    logger.error(err, 'Failed to initialize database deposit order context');
    return res.status(500).json({ error: 'Failed to initialize deposit order.' });
  } finally {
    connection.release();
  }

  // 7. Make outbound server-to-server request via Axios
  try {
    const formData = new URLSearchParams();
    formData.append('customer_mobile', req.user.phone || '9999999999');
    formData.append('customer_name', req.user.name || 'Playnixclub Player');
    formData.append('user_token', userToken);
    formData.append('amount', String(uniqueAmount));
    formData.append('order_id', orderId);
    formData.append('redirect_url', redirectUrl);
    formData.append('webhook_url', webhookUrl);

    const elapsed = Date.now() - startTime;
    const remainingTimeout = Math.max(1000, 5000 - elapsed);
    logger.info(`[Pay0 Outbound]: Sending request to create order ${orderId} for ₹${uniqueAmount} (remaining timeout: ${remainingTimeout}ms)`);

    const response = await axios.post('https://pay0.shop/api/create-order', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: remainingTimeout
    });

    if (response.data && response.data.status === true) {
      const paymentUrl = response.data.result?.payment_url;
      if (paymentUrl) {
        logger.info(`[Pay0 Success]: Order ${orderId} created. Payment URL generated successfully.`);
        await pool.query('UPDATE deposits SET payment_url = ? WHERE transaction_id = ?', [paymentUrl, orderId]);
        return res.json({
          success: true,
          payment_url: paymentUrl,
          amount: uniqueAmount,
          orderId
        });
      }
    }

    // If order creation returned status false, mark deposit as failed and release coupon
    logger.error(`[Pay0 Gateway Error]: ${JSON.stringify(response.data)}`);
    await pool.query('UPDATE deposits SET status = "failed" WHERE transaction_id = ?', [orderId]);
    if (depositId) {
      await releaseCouponForDeposit(pool, depositId);
    }
    return res.status(400).json({ error: response.data?.message || 'Failed to create payment order from gateway.' });

  } catch (err) {
    const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout') || (Date.now() - startTime >= 5000);
    if (isTimeout) {
      logger.error(`[Pay0 Gateway Timeout]: Outbound creation timed out after 5s threshold for order ${orderId}`);
    } else {
      logger.error(err, 'Failed to connect to Pay0 Gateway');
    }
    await pool.query('UPDATE deposits SET status = "failed" WHERE transaction_id = ?', [orderId]);
    if (depositId) {
      await releaseCouponForDeposit(pool, depositId);
    }
    return res.status(504).json({ error: 'Gateway response delayed. Please retry your deposit.' });
  }
};

/**
 * Phase 2 & Webhook Anti-Spoof Validation Shield: Settle dynamic payment orders
 * POST /api/payment/webhook
 */
export const pay0Webhook = async (req, res) => {
  const { status, order_id, amount } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required.' });
  }

  logger.info(`[Pay0 Webhook]: Inbound callback for Order: ${order_id}, Status: ${status}, Amount: ${amount}`);

  try {
    // 1. Fetch user token config from database
    const [configs] = await pool.query(
      'SELECT config_value FROM system_configs WHERE config_key = "PAY0_USER_TOKEN" LIMIT 1'
    );
    const userToken = decryptConfigValue(configs[0]?.config_value) || process.env.PAY0_USER_TOKEN;
    
    if (!userToken) {
      logger.error('[Pay0 Webhook]: Settlement failed because PAY0_USER_TOKEN is not configured in database or process.env.');
      return res.status(400).json({ error: 'Pay0 settings missing' });
    }

    // 2. Webhook Anti-Spoof Validation Shield: Verify directly with Pay0 server
    const checkForm = new URLSearchParams();
    checkForm.append('user_token', userToken);
    checkForm.append('order_id', order_id);

    const verification = await axios.post('https://pay0.shop/api/check-order-status', checkForm, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    const verifyData = verification.data;
    logger.info(`[Pay0 Webhook Verification]: Response for ${order_id}: ${JSON.stringify(verifyData)}`);

    if (!verifyData || verifyData.status !== true) {
      logger.warn(`[Pay0 Webhook Fraud Alert]: Verification failed or returned status false for order ${order_id}`);
      return res.status(400).json({ error: 'Order status verification failed' });
    }

    const gatewayStatus = String(verifyData.result?.status).toUpperCase();
    if (gatewayStatus !== 'SUCCESS' && gatewayStatus !== 'COMPLETED') {
      logger.warn(`[Pay0 Webhook Verification]: Order ${order_id} is not successfully paid. Status is: ${gatewayStatus}`);
      return res.json({ success: false, message: `Order status is ${gatewayStatus}. No credit applied.` });
    }

    // 3. Atomic Balance Updates: run within explicit isolated transaction with FOR UPDATE locks
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lock deposit row to prevent race conditions or duplicate webhook calls
      const [depositRows] = await connection.query(
        'SELECT id, user_id, amount, status, coupon_code FROM deposits WHERE transaction_id = ? FOR UPDATE',
        [order_id]
      );

      if (!depositRows || depositRows.length === 0) {
        await connection.rollback();
        logger.warn(`[Pay0 Webhook]: Deposit record not found for verified order ${order_id}`);
        return res.status(404).json({ error: 'Deposit record not found' });
      }

      const deposit = depositRows[0];
      if (deposit.status === 'completed') {
        await connection.rollback();
        logger.info(`[Pay0 Webhook]: Order ${order_id} was already completed. Skipping settlement.`);
        return res.json({ success: true, message: 'Deposit already processed' });
      }

      const userId = deposit.user_id;
      const depositAmount = parseFloat(deposit.amount);

      // Lock player wallet row
      const [wallets] = await connection.query(
        'SELECT id, balance, bonus_balance, required_wager, required_bonus_wager FROM wallets WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (!wallets || wallets.length === 0) {
        await connection.rollback();
        logger.error(`[Pay0 Webhook]: Wallet not found for user ID ${userId}`);
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const wallet = wallets[0];
      const currentBalance = parseFloat(wallet.balance || 0);
      const currentBonusBalance = parseFloat(wallet.bonus_balance || 0);
      const currentRequiredWager = parseFloat(wallet.required_wager || 0);
      const currentRequiredBonusWager = parseFloat(wallet.required_bonus_wager || 0);

      // Verify and process coupon code if applied
      let rewardAmount = 0;
      let userCouponId = null;
      let cashReward = 0;
      let bonusReward = 0;

      if (deposit.coupon_code) {
        const [userCoupons] = await connection.query(
          'SELECT uc.id, c.reward_amount, c.min_deposit_required ' +
          'FROM user_coupons uc ' +
          'JOIN coupons c ON uc.coupon_id = c.id ' +
          'JOIN deposit_coupons dc ON dc.user_coupon_id = uc.id ' +
          'WHERE dc.deposit_id = ? AND uc.user_id = ? AND c.code = ? AND dc.status = "LOCKED" ' +
          'LIMIT 1 FOR UPDATE',
          [deposit.id, userId, deposit.coupon_code]
        );

        if (userCoupons && userCoupons.length > 0) {
          const uCoupon = userCoupons[0];
          if (depositAmount >= parseFloat(uCoupon.min_deposit_required)) {
            rewardAmount = parseFloat(uCoupon.reward_amount);
            userCouponId = uCoupon.id;
            const split = getCouponSplit(deposit.coupon_code, rewardAmount, depositAmount);
            cashReward = split.cashReward;
            bonusReward = split.bonusReward;
          }
        }
      }

      const newBalance = parseFloat((currentBalance + depositAmount + cashReward).toFixed(2));
      const newBonusBalance = parseFloat((currentBonusBalance + bonusReward).toFixed(2));
      const newRequiredWager = parseFloat((currentRequiredWager + depositAmount + cashReward).toFixed(2));
      const newRequiredBonusWager = parseFloat((currentRequiredBonusWager + bonusReward * 10).toFixed(2));

      // Update balances
      await connection.query(
        'UPDATE wallets SET balance = ?, bonus_balance = ?, required_wager = ?, required_bonus_wager = ? WHERE user_id = ?',
        [newBalance, newBonusBalance, newRequiredWager, newRequiredBonusWager, userId]
      );

      // Update deposit record to completed
      await connection.query(
        'UPDATE deposits SET status = "completed" WHERE id = ?',
        [deposit.id]
      );

      // Mark user coupon as USED and deposit_coupon as CONSUMED if successfully verified
      if (userCouponId) {
        await connection.query(
          'UPDATE user_coupons SET status = "USED" WHERE id = ?',
          [userCouponId]
        );
        await connection.query(
          'UPDATE deposit_coupons SET status = "CONSUMED" WHERE deposit_id = ? AND user_coupon_id = ?',
          [deposit.id, userCouponId]
        );
      }

      // Write ledger transaction log for deposit
      await connection.query(
        'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
        'VALUES (?, ?, ?, "deposit", "deposits", ?, ?, ?, ?)',
        [userId, wallet.id, depositAmount, deposit.id, currentBalance, currentBalance + depositAmount, `Pay0 payment order auto-settlement (ID: ${order_id})`]
      );

      // Write ledger transaction log for coupon cash reward if applicable
      if (cashReward > 0 && userCouponId) {
        await connection.query(
          'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
          'VALUES (?, ?, ?, "bonus_claim", "user_coupons", ?, ?, ?, ?)',
          [userId, wallet.id, cashReward, userCouponId, currentBalance + depositAmount, newBalance, `Applied coupon cash reward (Code: ${deposit.coupon_code})`]
        );
      }

      // Update total deposits & bonus claimed stats
      await connection.query(
        'UPDATE user_stats SET total_deposits = total_deposits + ?, total_bonus_claimed = total_bonus_claimed + ? WHERE user_id = ?',
        [depositAmount, rewardAmount, userId]
      );

      // Process referral commission reward for the referrer if applicable
      await processReferralReward(connection, userId);

      // Send app notification
      const notificationMsg = rewardAmount > 0
        ? `Recharge of ₹${depositAmount} + Coupon reward of ₹${rewardAmount} was successfully verified and credited.`
        : `Recharge of ₹${depositAmount} was successfully verified and credited to your wallet.`;

      await createNotification(
        userId,
        'Wallet Credited!',
        notificationMsg,
        'WALLET',
        connection
      );

      await connection.commit();
      logger.info(`[Pay0 Webhook Success]: Settle transaction complete for User: ${userId}, Amount: ${depositAmount}`);

      // Dynamic check and convert to avoid circular dependencies
      try {
        const { checkAndConvertBonus, ioInstance } = await import('./gameController.js');
        const checkConn = await pool.getConnection();
        try {
          await checkConn.beginTransaction();
          const convResult = await checkAndConvertBonus(userId, checkConn);
          if (convResult.converted) {
            await checkConn.commit();
            if (ioInstance) {
              ioInstance.to(`user_room_${userId}`).emit('bonus_converted', {
                userId,
                amount: convResult.amount,
                newBalance: convResult.newBalance,
                newBonusBalance: convResult.newBonusBalance,
                requiredWager: convResult.requiredWager
              });
            }
          } else {
            await checkConn.rollback();
          }
        } catch (txSubErr) {
          await checkConn.rollback();
          logger.error(txSubErr, 'Sub-transaction failed in Webhook handler');
        } finally {
          checkConn.release();
        }
      } catch (impErr) {
        logger.error(impErr, 'Dynamic import in Webhook handler failed');
      }

      return res.json({ success: true, message: 'Deposit settled successfully' });

    } catch (txErr) {
      await connection.rollback();
      logger.error(txErr, 'Transaction failed in Webhook handler');
      return res.status(500).json({ error: 'Database transaction failure during settlement.' });
    } finally {
      connection.release();
    }

  } catch (err) {
    logger.error(err, 'Failed to process webhook verification');
    return res.status(500).json({ error: 'Internal server error during webhook verification.' });
  }
};

/**
 * Fetch active deposit history for user
 * GET /api/payment/history
 */
export const getDepositHistory = async (req, res) => {
  try {
    // 1. Automatic 3-Day (72h) pending deposit expiry query hook
    const expiredPending = await query(
      'SELECT d.id FROM deposits d ' +
      'LEFT JOIN deposit_appeals a ON d.id = a.deposit_id ' +
      'WHERE d.status = "pending" ' +
      'AND d.created_at < DATE_SUB(NOW(), INTERVAL 72 HOUR) ' +
      'AND a.id IS NULL'
    );
    if (expiredPending && expiredPending.length > 0) {
      const expiredIds = expiredPending.map(d => d.id);
      await query(
        'UPDATE deposits SET status = "failed" WHERE id IN (?)',
        [expiredIds]
      );
      for (const depositId of expiredIds) {
        await releaseCouponForDeposit(pool, depositId);
      }
    }

    // 2. Query deposits joined with the deposit appeals
    const rows = await query(
      'SELECT d.id, d.amount, d.transaction_id as transactionId, d.status, d.created_at as createdAt, ' +
      'a.status as appealStatus, a.admin_note as appealAdminNote ' +
      'FROM deposits d ' +
      'LEFT JOIN deposit_appeals a ON d.id = a.deposit_id ' +
      'WHERE d.user_id = ? ORDER BY d.created_at DESC LIMIT 100',
      [req.user.id]
    );
    return res.json(rows || []);
  } catch (err) {
    logger.error(err, 'Failed to fetch deposit history');
    return res.status(500).json({ error: 'Failed to retrieve deposit history.' });
  }
};

/**
 * Phase 2 & Webhook Anti-Spoof Validation Shield: Submit appeal dispute
 * POST /api/payment/appeal
 */
export const submitAppeal = async (req, res) => {
  const { utr, whatsapp, depositId } = req.body;

  if (!utr || !whatsapp) {
    return res.status(400).json({ error: 'UTR number and WhatsApp phone number are required.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Payment screenshot file upload is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (depositId) {
      const parsedDepId = parseInt(depositId, 10);
      
      // 1. Lock associated deposit row to prevent race conditions
      const [deposits] = await connection.query(
        'SELECT id FROM deposits WHERE id = ? FOR UPDATE',
        [parsedDepId]
      );
      
      if (!deposits || deposits.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Associated deposit record not found.' });
      }

      // 2. Lock check if appeal already exists for this depositId (any status)
      const [existingAppealForDeposit] = await connection.query(
        'SELECT id FROM deposit_appeals WHERE deposit_id = ? LIMIT 1 FOR UPDATE',
        [parsedDepId]
      );
      
      if (existingAppealForDeposit && existingAppealForDeposit.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: "An appeal has already been processed or is pending for this deposit." });
      }
    }

    // Check if UTR is already registered under appeals
    const [existingAppeal] = await connection.query(
      'SELECT id FROM deposit_appeals WHERE utr_number = ? LIMIT 1 FOR UPDATE',
      [utr]
    );

    if (existingAppeal && existingAppeal.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'This UTR number has already been submitted for review.' });
    }

    const screenshotUrl = `/uploads/screenshots/${req.file.filename}`;

    await connection.query(
      'INSERT INTO deposit_appeals (user_id, deposit_id, utr_number, screenshot_url, whatsapp_number, status) VALUES (?, ?, ?, ?, ?, "pending")',
      [req.user.id, depositId ? parseInt(depositId, 10) : null, utr.trim(), screenshotUrl, whatsapp.trim()]
    );

    await connection.commit();
    logger.info(`[Deposit Appeal]: Submitted by User ${req.user.id} for UTR ${utr}`);
    return res.json({ success: true, message: 'Appeal submitted successfully. Our billing team will verify it shortly.' });

  } catch (err) {
    if (connection) await connection.rollback();
    logger.error(err, 'Failed to submit payment appeal');
    return res.status(500).json({ error: 'Failed to record payment appeal due to database errors.' });
  } finally {
    connection.release();
  }
};

/**
 * Fetch appeals list for Admin Dashboard
 * GET /api/payment/admin/appeals
 */
export const getAdminAppeals = async (req, res) => {
  try {
    const rows = await query(
      'SELECT a.id, a.utr_number as utrNumber, a.screenshot_url as screenshotUrl, a.whatsapp_number as whatsappNumber, a.status, a.created_at as createdAt, u.name as userName, u.phone as userPhone FROM deposit_appeals a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC'
    );
    return res.json(rows || []);
  } catch (err) {
    logger.error(err, 'Failed to fetch admin appeals');
    return res.status(500).json({ error: 'Failed to retrieve payment disputes list.' });
  }
};

/**
 * Resolve / Approve or Reject an appeal
 * POST /api/payment/admin/appeals/:id/resolve
 */
export const resolveAppeal = async (req, res) => {
  const { id } = req.params;
  const { status, adminNote } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid appeal resolution status. Must be approved or rejected.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock the appeal row
    const [appeals] = await connection.query(
      'SELECT * FROM deposit_appeals WHERE id = ? LIMIT 1 FOR UPDATE',
      [id]
    );

    if (!appeals || appeals.length === 0) {
      await connection.rollback();
      logger.warn({ id }, 'Appeal record not found during resolution');
      return res.status(404).json({ error: 'Appeal record not found.' });
    }

    const appeal = appeals[0];
    if (appeal.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'This appeal has already been resolved.' });
    }

    const depositId = appeal.deposit_id;
    const userId = appeal.user_id;

    if (status === 'approved') {
      if (!depositId) {
        await connection.rollback();
        return res.status(400).json({ error: 'No associated deposit found for this appeal. Cannot auto-approve wallet credit.' });
      }

      // Lock the deposit row
      const [deposits] = await connection.query(
        'SELECT * FROM deposits WHERE id = ? LIMIT 1 FOR UPDATE',
        [depositId]
      );

      if (!deposits || deposits.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Associated deposit record not found.' });
      }

      const deposit = deposits[0];
      if (deposit.status === 'completed') {
        await connection.rollback();
        return res.status(400).json({ error: 'The deposit is already completed.' });
      }

      // Lock the wallet row
      const [wallets] = await connection.query(
        'SELECT id, balance, bonus_balance, required_wager, required_bonus_wager FROM wallets WHERE user_id = ? LIMIT 1 FOR UPDATE',
        [userId]
      );

      if (!wallets || wallets.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'User wallet not found.' });
      }

      const wallet = wallets[0];
      const depositAmount = parseFloat(deposit.amount);
      const currentBalance = parseFloat(wallet.balance || 0);
      const currentBonusBalance = parseFloat(wallet.bonus_balance || 0);
      const currentRequiredWager = parseFloat(wallet.required_wager || 0);
      const currentRequiredBonusWager = parseFloat(wallet.required_bonus_wager || 0);

      // Verify and process coupon code if applied
      let rewardAmount = 0;
      let userCouponId = null;
      let cashReward = 0;
      let bonusReward = 0;

      if (deposit.coupon_code) {
        const [userCoupons] = await connection.query(
          'SELECT uc.id, c.reward_amount, c.min_deposit_required ' +
          'FROM user_coupons uc ' +
          'JOIN coupons c ON uc.coupon_id = c.id ' +
          'JOIN deposit_coupons dc ON dc.user_coupon_id = uc.id ' +
          'WHERE dc.deposit_id = ? AND uc.user_id = ? AND c.code = ? AND dc.status = "LOCKED" ' +
          'LIMIT 1 FOR UPDATE',
          [depositId, userId, deposit.coupon_code]
        );

        if (userCoupons && userCoupons.length > 0) {
          const uCoupon = userCoupons[0];
          if (depositAmount >= parseFloat(uCoupon.min_deposit_required)) {
            rewardAmount = parseFloat(uCoupon.reward_amount);
            userCouponId = uCoupon.id;
            const split = getCouponSplit(deposit.coupon_code, rewardAmount, depositAmount);
            cashReward = split.cashReward;
            bonusReward = split.bonusReward;
          }
        }
      }

      const newBalance = parseFloat((currentBalance + depositAmount + cashReward).toFixed(2));
      const newBonusBalance = parseFloat((currentBonusBalance + bonusReward).toFixed(2));
      const newRequiredWager = parseFloat((currentRequiredWager + depositAmount + cashReward).toFixed(2));
      const newRequiredBonusWager = parseFloat((currentRequiredBonusWager + bonusReward * 10).toFixed(2));

      // Update balances
      await connection.query(
        'UPDATE wallets SET balance = ?, bonus_balance = ?, required_wager = ?, required_bonus_wager = ? WHERE user_id = ?',
        [newBalance, newBonusBalance, newRequiredWager, newRequiredBonusWager, userId]
      );

      // Update deposit record to completed
      await connection.query(
        'UPDATE deposits SET status = "completed", processed_by = ?, processed_at = NOW() WHERE id = ?',
        [req.user.id, deposit.id]
      );

      // Mark user coupon as USED and deposit_coupon as CONSUMED if successfully verified
      if (userCouponId) {
        await connection.query(
          'UPDATE user_coupons SET status = "USED" WHERE id = ?',
          [userCouponId]
        );
        await connection.query(
          'UPDATE deposit_coupons SET status = "CONSUMED" WHERE deposit_id = ? AND user_coupon_id = ?',
          [depositId, userCouponId]
        );
      }

      // Write ledger transaction log for deposit
      await connection.query(
        'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
        'VALUES (?, ?, ?, "deposit", "deposits", ?, ?, ?, ?)',
        [userId, wallet.id, depositAmount, deposit.id, currentBalance, currentBalance + depositAmount, `Customer support appeal approval (Appeal ID: ${id})`]
      );

      // Write ledger transaction log for coupon cash reward if applicable
      if (cashReward > 0 && userCouponId) {
        await connection.query(
          'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
          'VALUES (?, ?, ?, "bonus_claim", "user_coupons", ?, ?, ?, ?)',
          [userId, wallet.id, cashReward, userCouponId, currentBalance + depositAmount, newBalance, `Applied coupon cash reward via appeal (Code: ${deposit.coupon_code})`]
        );
      }

      // Update total deposits & bonus claimed stats
      await connection.query(
        'UPDATE user_stats SET total_deposits = total_deposits + ?, total_bonus_claimed = total_bonus_claimed + ? WHERE user_id = ?',
        [depositAmount, rewardAmount, userId]
      );

      // Process referral commission reward for the referrer if applicable
      await processReferralReward(connection, userId);

      // Send app notification
      const notificationMsg = rewardAmount > 0
        ? `Appeal recharge of ₹${depositAmount} + Coupon reward of ₹${rewardAmount} was successfully approved and credited.`
        : `Appeal recharge of ₹${depositAmount} was successfully approved and credited to your wallet.`;

      await createNotification(
        userId,
        'Wallet Credited via Appeal!',
        notificationMsg,
        'WALLET',
        connection
      );
    } else {
      // status === 'rejected'
      if (depositId) {
        // Lock the deposit row and mark it as failed
        const [deposits] = await connection.query(
          'SELECT * FROM deposits WHERE id = ? LIMIT 1 FOR UPDATE',
          [depositId]
        );
        if (deposits && deposits.length > 0 && deposits[0].status === 'pending') {
          await connection.query(
            'UPDATE deposits SET status = "failed", processed_by = ?, processed_at = NOW() WHERE id = ?',
            [req.user.id, depositId]
          );
          // Release coupon back to user inventory
          await releaseCouponForDeposit(connection, depositId);
        }
      }
    }

    // Update appeal record to status with adminNote
    await connection.query(
      'UPDATE deposit_appeals SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?',
      [status, adminNote || null, id]
    );

    await connection.commit();
    logger.info(`[Appeal Resolved]: Appeal ID ${id} resolved with status ${status} by Admin ${req.user.id}`);

    // Dynamic check and convert to avoid circular dependencies
    if (status === 'completed') {
      try {
        const { checkAndConvertBonus, ioInstance } = await import('./gameController.js');
        const checkConn = await pool.getConnection();
        try {
          await checkConn.beginTransaction();
          const convResult = await checkAndConvertBonus(userId, checkConn);
          if (convResult.converted) {
            await checkConn.commit();
            if (ioInstance) {
              ioInstance.to(`user_room_${userId}`).emit('bonus_converted', {
                userId,
                amount: convResult.amount,
                newBalance: convResult.newBalance,
                newBonusBalance: convResult.newBonusBalance,
                requiredWager: convResult.requiredWager
              });
            }
          } else {
            await checkConn.rollback();
          }
        } catch (txSubErr) {
          await checkConn.rollback();
          logger.error(txSubErr, 'Sub-transaction failed in Appeal Resolver');
        } finally {
          checkConn.release();
        }
      } catch (impErr) {
        logger.error(impErr, 'Dynamic import in Appeal Resolver failed');
      }
    }
    
    // Dispatch Telegram admin bot log
    await sendAdminAlert(`📢 Deposit Appeal Resolved\nAppeal ID: ${id}\nAdmin: ${req.user.name}\nStatus: ${status.toUpperCase()}\nNote: ${adminNote || 'None'}`);

    return res.json({ success: true, message: `Appeal was successfully marked as ${status}.` });

  } catch (err) {
    if (connection) await connection.rollback();
    logger.error(err, 'Failed to resolve appeal');
    
    // Dispatch failure alert to Telegram
    await sendAdminAlert(`⚠️ CRITICAL ERROR: Appeal Resolution Failure\nAppeal ID: ${id}\nError: ${err.message}`);
    
    return res.status(500).json({ error: 'Failed to resolve the payment dispute.' });
  } finally {
    connection.release();
  }
};

/**
 * Fetch active available coupons for user
 * GET /api/payment/coupons
 */
export const getUserCoupons = async (req, res) => {
  try {
    // Auto-expire old available coupons first to keep it clean
    await query(
      'UPDATE user_coupons SET status = "EXPIRED" WHERE status = "AVAILABLE" AND expires_at <= NOW()'
    );

    const rows = await query(
      'SELECT uc.id, c.code, c.type, c.reward_amount as rewardAmount, c.min_deposit_required as minDepositRequired, uc.expires_at as expiresAt ' +
      'FROM user_coupons uc ' +
      'JOIN coupons c ON uc.coupon_id = c.id ' +
      'WHERE uc.user_id = ? AND uc.status = "AVAILABLE" AND uc.expires_at > NOW() ORDER BY uc.allocated_at DESC',
      [req.user.id]
    );

    return res.json(rows || []);
  } catch (err) {
    logger.error(err, 'Failed to fetch user coupons');
    return res.status(500).json({ error: 'Failed to retrieve active coupons.' });
  }
};

/**
 * Claim a no-deposit gameplay coupon
 * POST /api/payment/coupons/claim
 */
export const claimNoDepositCoupon = async (req, res) => {
  const { couponCode } = req.body;

  if (!couponCode) {
    return res.status(400).json({ error: 'Coupon code is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock user's wallet
    const [wallets] = await connection.query(
      'SELECT id, bonus_balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    if (!wallets || wallets.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    // 2. Lock user's available coupon matching this code
    const [userCoupons] = await connection.query(
      'SELECT uc.id, c.reward_amount, c.type ' +
      'FROM user_coupons uc ' +
      'JOIN coupons c ON uc.coupon_id = c.id ' +
      'WHERE uc.user_id = ? AND c.code = ? AND uc.status = "AVAILABLE" AND uc.expires_at > NOW() ' +
      'LIMIT 1 FOR UPDATE',
      [req.user.id, couponCode.trim().toUpperCase()]
    );

    if (!userCoupons || userCoupons.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'This coupon code is invalid, expired, or already claimed.' });
    }

    const uCoupon = userCoupons[0];
    if (uCoupon.type !== 'GAMEPLAY_FREEBIE') {
      await connection.rollback();
      return res.status(400).json({ error: 'This coupon type requires a deposit and cannot be claimed directly.' });
    }

    const rewardAmount = parseFloat(uCoupon.reward_amount);
    const wallet = wallets[0];
    const currentBonus = parseFloat(wallet.bonus_balance || 0);
    const newBonus = parseFloat((currentBonus + rewardAmount).toFixed(4));

    // 3. Mark coupon as USED
    await connection.query(
      'UPDATE user_coupons SET status = "USED" WHERE id = ?',
      [uCoupon.id]
    );

    // 4. Update wallet bonus balance
    await connection.query(
      'UPDATE wallets SET bonus_balance = ? WHERE user_id = ?',
      [newBonus, req.user.id]
    );

    // 5. Write to ledger
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "bonus_claim", "user_coupons", ?, ?, ?, ?)',
      [req.user.id, wallet.id, rewardAmount, uCoupon.id, currentBonus, newBonus, `Claimed gameplay freebie coupon: ${couponCode}`]
    );

    // 6. Update user stats
    await connection.query(
      'UPDATE user_stats SET total_bonus_claimed = total_bonus_claimed + ? WHERE user_id = ?',
      [rewardAmount, req.user.id]
    );

    // 7. Notify user
    await createNotification(
      req.user.id,
      'Free Bet Claimed!',
      `You successfully claimed ₹${rewardAmount} free bet bonus cash! Play colour prediction or dice now.`,
      'COUPON',
      connection
    );

    await connection.commit();
    return res.json({ success: true, message: `Successfully claimed ₹${rewardAmount} bonus cash.` });

  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to claim gameplay coupon');
    return res.status(500).json({ error: 'Database transaction failure during claiming.' });
  } finally {
    connection.release();
  }
};

export const processReferralReward = async (connection, referredUserId) => {
  try {
    // 1. Check if this user was referred by someone
    const [referrals] = await connection.query(
      'SELECT id, referrer_id, status FROM referrals WHERE referred_id = ? LIMIT 1 FOR UPDATE',
      [referredUserId]
    );

    if (referrals && referrals.length > 0) {
      const referral = referrals[0];
      
      // If status is 'registered', reward the referrer
      if (referral.status === 'registered') {
        const referrerId = referral.referrer_id;

        // 2. Lock referrer's wallet
        const [wallets] = await connection.query(
          'SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
          [referrerId]
        );

        if (wallets && wallets.length > 0) {
          const wallet = wallets[0];
          const currentBalance = parseFloat(wallet.balance || 0);
          const rewardAmount = 10.00;
          const newBalance = parseFloat((currentBalance + rewardAmount).toFixed(2));

          // 3. Update referrer's wallet balance
          await connection.query(
            'UPDATE wallets SET balance = ? WHERE user_id = ?',
            [newBalance, referrerId]
          );

          // 4. Update referral status to rewarded
          await connection.query(
            'UPDATE referrals SET status = "rewarded", total_deposit_amount = total_deposit_amount + 10.00 WHERE id = ?',
            [referral.id]
          );

          // 5. Write to ledger (wallet_transactions) for the referrer
          await connection.query(
            'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
            'VALUES (?, ?, ?, "commission", "referrals", ?, ?, ?, ?)',
            [referrerId, wallet.id, rewardAmount, referral.id, currentBalance, newBalance, `Referral commission of ₹10.00 for invitee (User ID: ${referredUserId}) first deposit completion`]
          );

          // 6. Notify referrer
          await createNotification(
            referrerId,
            'Referral Bonus Credited! 🎁',
            `Congratulations! You received ₹10.00 referral bonus because your invitee completed their first deposit.`,
            'WALLET',
            connection
          );

          logger.info(`[Referral Reward]: Referrer ${referrerId} awarded ₹10.00 commission for referred user ${referredUserId}`);
        }
      }
    }
  } catch (err) {
    logger.error(err, `Failed to process referral reward for referred user ID ${referredUserId}`);
  }
};
