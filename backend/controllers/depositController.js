import axios from 'axios';
import { query, pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { createNotification } from '../utils/notifier.js';
import { decryptConfigValue } from '../utils/configEncryption.js';

/**
 * Phase 1 & Phase 3: Outbound Deposit Execution Engine with Unique Decimals
 * POST /api/payment/create
 */
export const createDeposit = async (req, res) => {
  const { amount: targetBaseAmount } = req.body;

  if (!targetBaseAmount || isNaN(targetBaseAmount)) {
    return res.status(400).json({ error: 'Deposit amount is required and must be a valid number.' });
  }

  const baseAmount = parseFloat(targetBaseAmount);
  if (baseAmount < 100 || baseAmount > 50000) {
    return res.status(400).json({ error: 'Deposit amount must be between ₹100 and ₹50,000.' });
  }

  try {
    // 1. Fetch Pay0 user token from database
    const [configs] = await pool.query(
      'SELECT config_value FROM system_configs WHERE config_key = "PAY0_USER_TOKEN" LIMIT 1'
    );
    const userToken = decryptConfigValue(configs[0]?.config_value) || process.env.PAY0_USER_TOKEN;
    
    if (!userToken) {
      logger.warn('[Pay0 Integration]: User token (PAY0_USER_TOKEN) is empty or unseeded in system_configs table and process.env.');
      return res.status(400).json({ error: 'The deposit gateway is temporarily unavailable. Please contact support.' });
    }

    // 2. Unique Decimal Rule: Randomized deviation between -1.00 and 0.00
    let deviation = -Math.random();
    let uniqueAmount = parseFloat((baseAmount + deviation).toFixed(2));
    let isUnique = false;
    let attempts = 0;

    // Shift fraction in case of overlap within a 1-rupee range
    while (!isUnique && attempts < 100) {
      const [existing] = await pool.query(
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

    // Generate Order ID sequence format: RR-DEP-${Date.now()}
    const orderId = `RR-DEP-${Date.now()}`;

    // 3. Save pending transaction in deposits
    // We get the default active payment method (UPI) or insert null
    const [paymentMethods] = await pool.query(
      'SELECT id FROM payment_methods WHERE type = "upi" LIMIT 1'
    );
    const paymentMethodId = paymentMethods[0]?.id || null;

    await pool.query(
      'INSERT INTO deposits (user_id, payment_method_id, amount, transaction_id, status) VALUES (?, ?, ?, ?, "pending")',
      [req.user.id, paymentMethodId, uniqueAmount, orderId]
    );

    // 4. Outbound server-to-server request via Axios using form-urlencoded headers
    // Fetch configurable webhook and redirect URLs from system_configs
    const [webhookConfigs] = await pool.query(
      'SELECT config_key, config_value FROM system_configs WHERE config_key IN ("PAY0_WEBHOOK_URL", "PAY0_REDIRECT_URL")'
    );
    const configMap = {};
    webhookConfigs.forEach(row => { configMap[row.config_key] = decryptConfigValue(row.config_value); });

    const webhookUrl = configMap['PAY0_WEBHOOK_URL'] || `${req.protocol}://${req.get('host')}/api/payment/webhook`;
    const redirectUrl = configMap['PAY0_REDIRECT_URL'] || `${req.protocol}://${req.get('host')}/#/wallet?tab=deposit`;

    logger.info(`[Pay0 Outbound]: Using webhook URL: ${webhookUrl}`);

    const formData = new URLSearchParams();
    formData.append('customer_mobile', req.user.phone || '9999999999');
    formData.append('customer_name', req.user.name || 'RRClub Player');
    formData.append('user_token', userToken);
    formData.append('amount', String(uniqueAmount));
    formData.append('order_id', orderId);
    formData.append('redirect_url', redirectUrl);
    formData.append('webhook_url', webhookUrl);

    logger.info(`[Pay0 Outbound]: Sending request to create order ${orderId} for ₹${uniqueAmount}`);

    const response = await axios.post('https://pay0.shop/api/create-order', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    if (response.data && response.data.status === true) {
      const paymentUrl = response.data.result?.payment_url;
      if (paymentUrl) {
        return res.json({
          success: true,
          payment_url: paymentUrl,
          amount: uniqueAmount,
          orderId
        });
      }
    }

    // If order creation returned status false, log and throw
    logger.error(`[Pay0 Gateway Error]: ${JSON.stringify(response.data)}`);
    return res.status(400).json({ error: response.data?.message || 'Failed to create payment order from gateway.' });

  } catch (err) {
    logger.error(err, 'Failed to initialize deposit order via Pay0');
    return res.status(500).json({ error: 'Failed to initialize deposit order due to server connection issues.' });
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
        'SELECT id, user_id, amount, status FROM deposits WHERE transaction_id = ? FOR UPDATE',
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
        'SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      if (!wallets || wallets.length === 0) {
        await connection.rollback();
        logger.error(`[Pay0 Webhook]: Wallet not found for user ID ${userId}`);
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const wallet = wallets[0];
      const currentBalance = parseFloat(wallet.balance || 0);
      const newBalance = parseFloat((currentBalance + depositAmount).toFixed(4));

      // Update balances
      await connection.query(
        'UPDATE wallets SET balance = ? WHERE user_id = ?',
        [newBalance, userId]
      );

      // Update deposit record to completed
      await connection.query(
        'UPDATE deposits SET status = "completed" WHERE id = ?',
        [deposit.id]
      );

      // Write ledger transaction log
      await connection.query(
        'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
        'VALUES (?, ?, ?, "deposit", "deposits", ?, ?, ?, ?)',
        [userId, wallet.id, depositAmount, deposit.id, currentBalance, newBalance, `Pay0 payment order auto-settlement (ID: ${order_id})`]
      );

      // Update total deposits stats
      await connection.query(
        'UPDATE user_stats SET total_deposits = total_deposits + ? WHERE user_id = ?',
        [depositAmount, userId]
      );

      // Send app notification
      await createNotification(
        userId,
        'Wallet Credited!',
        `Recharge of ₹${depositAmount} was successfully verified and credited to your wallet.`,
        'WALLET',
        connection
      );

      await connection.commit();
      logger.info(`[Pay0 Webhook Success]: Settle transaction complete for User: ${userId}, Amount: ${depositAmount}`);
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
    const rows = await query(
      'SELECT id, amount, transaction_id as transactionId, status, created_at as createdAt FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
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
  const { utr, whatsapp } = req.body;

  if (!utr || !whatsapp) {
    return res.status(400).json({ error: 'UTR number and WhatsApp phone number are required.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Payment screenshot file upload is required.' });
  }

  try {
    // Check if UTR is already registered under appeals
    const [existingAppeal] = await pool.query(
      'SELECT id FROM deposit_appeals WHERE utr_number = ? LIMIT 1',
      [utr]
    );

    if (existingAppeal && existingAppeal.length > 0) {
      return res.status(400).json({ error: 'This UTR number has already been submitted for review.' });
    }

    const screenshotUrl = `/uploads/screenshots/${req.file.filename}`;

    await pool.query(
      'INSERT INTO deposit_appeals (user_id, utr_number, screenshot_url, whatsapp_number, status) VALUES (?, ?, ?, ?, "pending")',
      [req.user.id, utr.trim(), screenshotUrl, whatsapp.trim()]
    );

    logger.info(`[Deposit Appeal]: Submitted by User ${req.user.id} for UTR ${utr}`);
    return res.json({ success: true, message: 'Appeal submitted successfully. Our billing team will verify it shortly.' });

  } catch (err) {
    logger.error(err, 'Failed to submit payment appeal');
    return res.status(500).json({ error: 'Failed to record payment appeal due to database errors.' });
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
  const { status } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid appeal resolution status. Must be approved or rejected.' });
  }

  try {
    const [appeals] = await pool.query(
      'SELECT id, status FROM deposit_appeals WHERE id = ? LIMIT 1',
      [id]
    );

    if (!appeals || appeals.length === 0) {
      return res.status(404).json({ error: 'Appeal record not found.' });
    }

    if (appeals[0].status !== 'pending') {
      return res.status(400).json({ error: 'This appeal has already been resolved.' });
    }

    await pool.query(
      'UPDATE deposit_appeals SET status = ? WHERE id = ?',
      [status, id]
    );

    logger.info(`[Appeal Resolved]: Appeal ID ${id} resolved with status ${status} by Admin ${req.user.id}`);
    return res.json({ success: true, message: `Appeal was successfully marked as ${status}.` });

  } catch (err) {
    logger.error(err, 'Failed to resolve appeal');
    return res.status(500).json({ error: 'Failed to resolve the payment dispute.' });
  }
};
