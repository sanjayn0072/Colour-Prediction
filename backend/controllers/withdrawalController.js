import { query, pool } from '../config/db.js';
import { ioInstance } from './gameController.js';
import { sendWithdrawalAlert } from '../utils/telegram.js';
import logger from '../utils/logger.js';
import { createNotification } from '../utils/notifier.js';

// Helper to generate a unique withdrawal ID
const generateWithdrawalId = () => {
  return `WDR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

/**
 * Withdrawal Fee Calculator
 * Rules:
 * - ₹100 exactly:    9% fee (₹9)
 * - ₹101 – ₹1,000:  ₹9 base (for first ₹100) + 3% on each additional ₹100 increment
 * - Above ₹1,000:    Flat 3% of entire amount
 */
const calculateWithdrawalFee = (amount) => {
  const num = parseFloat(amount);
  if (!num || num <= 0) return 0;
  let fee = 0;
  if (num <= 100) {
    fee = num * 0.09;
  } else if (num <= 1000) {
    fee = 9 + (num - 100) * 0.03;
  } else {
    fee = num * 0.03;
  }
  return Math.round(fee * 100) / 100;
};

// 1. POST /api/withdraw
export const createWithdrawal = async (req, res) => {
  const { amount, paymentMethod, upiId, accountHolderName, accountNumber, ifscCode } = req.body;

  // Enforce validation
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ success: false, message: 'Valid amount is required.' });
  }

  const withdrawalAmount = parseFloat(amount);
  if (withdrawalAmount < 100.00) {
    return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹100.00.' });
  }

  if (!paymentMethod || !['UPI', 'BANK'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Valid payment method (UPI or BANK) is required.' });
  }

  if (paymentMethod === 'UPI' && (!upiId || upiId.trim() === '')) {
    return res.status(400).json({ success: false, message: 'UPI ID is required for UPI withdrawals.' });
  }

  if (paymentMethod === 'BANK') {
    if (!accountHolderName || accountHolderName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Account holder name is required for bank withdrawals.' });
    }
    if (!accountNumber || accountNumber.trim() === '') {
      return res.status(400).json({ success: false, message: 'Account number is required for bank withdrawals.' });
    }
    if (!ifscCode || ifscCode.trim() === '') {
      return res.status(400).json({ success: false, message: 'IFSC code is required for bank withdrawals.' });
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Multi-row locking: Lock wallet row to prevent concurrent wagers/withdrawals
    const [wallets] = await connection.query(
      'SELECT id, balance, locked_balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );

    if (wallets.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Wallet not found.' });
    }

    const wallet = wallets[0];
    const availableBalance = parseFloat(wallet.balance);

    // VIP mathematical validation rules check inside active transaction
    const [statsRows] = await connection.query(
      'SELECT total_deposits FROM user_stats WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    const totalDeposits = statsRows.length > 0 ? parseFloat(statsRows[0].total_deposits) : 0;
    
    let vipLevel = 0;
    const vipTiers = [
      { level: 1, min: 100 },
      { level: 2, min: 200 },
      { level: 3, min: 500 },
      { level: 4, min: 1000 },
      { level: 5, min: 2000 },
      { level: 6, min: 5000 },
      { level: 7, min: 10000 },
      { level: 8, min: 15000 },
      { level: 9, min: 20000 },
      { level: 10, min: 30000 },
      { level: 11, min: 45000 },
      { level: 12, min: 60000 },
      { level: 13, min: 80000 },
      { level: 14, min: 100000 },
      { level: 15, min: 130000 },
      { level: 16, min: 160000 },
      { level: 17, min: 200000 },
      { level: 18, min: 230000 },
      { level: 19, min: 260000 },
      { level: 20, min: 300000 }
    ];
    for (const t of vipTiers) {
      if (totalDeposits >= t.min) {
        vipLevel = t.level;
      } else {
        break;
      }
    }

    const [withdrawRows] = await connection.query(
      'SELECT SUM(amount) as total FROM withdrawals WHERE user_id = ? AND status IN ("completed", "approved")',
      [req.user.id]
    );
    const cumulativeWithdrawals = withdrawRows[0].total ? parseFloat(withdrawRows[0].total) : 0;

    if (vipLevel === 0) {
      if (cumulativeWithdrawals + withdrawalAmount > 2000) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'VIP 0 users can only withdraw up to ₹2,000 total. Please upgrade your VIP tier.' });
      }
    } else {
      const vipReqs = {
        1: 100, 2: 200, 3: 500, 4: 1000, 5: 2000, 6: 5000, 7: 10000, 
        8: 15000, 9: 20000, 10: 30000, 11: 45000, 12: 60000, 13: 80000, 
        14: 100000, 15: 130000, 16: 160000, 17: 200000, 18: 230000, 19: 260000, 20: 300000
      };
      const vipDepositReq = vipReqs[vipLevel] || 100;
      const maxTierWithdrawal = vipDepositReq * 30;
      if (cumulativeWithdrawals + withdrawalAmount > maxTierWithdrawal) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Tier withdrawal limit reached. Please upgrade your VIP level to unlock further limits.' });
      }
    }

    // B. Check for existing pending withdrawals to block duplicates
    const [pending] = await connection.query(
      'SELECT id FROM withdrawals WHERE user_id = ? AND status = "PENDING" FOR UPDATE',
      [req.user.id]
    );

    if (pending.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'You already have a pending withdrawal request.' });
    }

    let processingFee = calculateWithdrawalFee(withdrawalAmount);
    let usedCouponId = null;

    // Check for an active FEE_WAIVER coupon
    const [feeWaivers] = await connection.query(
      'SELECT uc.id, c.code ' +
      'FROM user_coupons uc ' +
      'JOIN coupons c ON uc.coupon_id = c.id ' +
      'WHERE uc.user_id = ? AND c.type = "FEE_WAIVER" AND uc.status = "AVAILABLE" AND uc.expires_at > NOW() ' +
      'LIMIT 1 FOR UPDATE',
      [req.user.id]
    );

    if (feeWaivers && feeWaivers.length > 0) {
      processingFee = 0;
      usedCouponId = feeWaivers[0].id;
    }

    const totalDebitAmount = Number(withdrawalAmount) + Number(processingFee);

    // C. Check sufficient available balance
    if (availableBalance < totalDebitAmount) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'insufficient balance' });
    }

    // D. Transition balance: subtract from balance, add to locked_balance
    const newAvailable = parseFloat((availableBalance - totalDebitAmount).toFixed(2));
    const newLocked = parseFloat((parseFloat(wallet.locked_balance) + totalDebitAmount).toFixed(2));

    await connection.query(
      'UPDATE wallets SET balance = ?, locked_balance = ? WHERE user_id = ?',
      [newAvailable, newLocked, req.user.id]
    );

    // E. Save the request as PENDING
    const withdrawalId = generateWithdrawalId();
    const [insertResult] = await connection.query(
      'INSERT INTO withdrawals (withdrawal_id, user_id, amount, payment_method, upi_id, account_holder_name, account_number, ifsc_code, status) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, "PENDING")',
      [
        withdrawalId,
        req.user.id,
        withdrawalAmount,
        paymentMethod,
        paymentMethod === 'UPI' ? upiId.trim() : null,
        paymentMethod === 'BANK' ? accountHolderName.trim() : null,
        paymentMethod === 'BANK' ? accountNumber.trim() : null,
        paymentMethod === 'BANK' ? ifscCode.trim() : null
      ]
    );

    // F. Record transactions in ledger separately
    const balanceAfterPayout = parseFloat((availableBalance - withdrawalAmount).toFixed(2));

    // Payout Net Amount
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "withdrawal", "withdrawals", ?, ?, ?, ?)',
      [req.user.id, wallet.id, -withdrawalAmount, insertResult.insertId, availableBalance, balanceAfterPayout, `Withdrawal net amount payout: ${withdrawalId}`]
    );

    // Processing Fee
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "withdrawal", "withdrawals", ?, ?, ?, ?)',
      [req.user.id, wallet.id, -processingFee, insertResult.insertId, balanceAfterPayout, newAvailable, `Withdrawal processing fee debit: ${withdrawalId}`]
    );

    // Mark user coupon as USED if applicable
    if (usedCouponId) {
      await connection.query(
        'UPDATE user_coupons SET status = "USED" WHERE id = ?',
        [usedCouponId]
      );
    }

    await connection.commit();

    // G. Trigger Telegram alert asynchronously
    sendWithdrawalAlert({
      withdrawalId,
      name: req.user.name,
      amount: withdrawalAmount,
      paymentMethod,
      upiId: paymentMethod === 'UPI' ? upiId.trim() : null,
      accountHolderName: paymentMethod === 'BANK' ? accountHolderName.trim() : null,
      accountNumber: paymentMethod === 'BANK' ? accountNumber.trim() : null,
      ifscCode: paymentMethod === 'BANK' ? ifscCode.trim() : null
    }).catch(err => logger.error(err, 'Telegram withdrawal alert dispatch failed'));

    return res.status(201).json({
      message: 'Withdrawal request submitted successfully.',
      withdrawal: {
        withdrawalId,
        amount: withdrawalAmount,
        paymentMethod,
        status: 'PENDING',
        createdAt: new Date()
      },
      balances: {
        available: newAvailable,
        locked: newLocked
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Error in createWithdrawal transaction');
    return res.status(500).json({ success: false, message: 'Internal server error processing withdrawal.' });
  } finally {
    connection.release();
  }
};

// 2. GET /api/withdraw/history
export const getWithdrawalHistory = async (req, res) => {
  try {
    const records = await query(
      'SELECT id, withdrawal_id as withdrawalId, amount, payment_method as paymentMethod, upi_id as upiId, ' +
      'account_holder_name as accountHolderName, account_number as accountNumber, ifsc_code as ifscCode, ' +
      'status, utr_number as utrNumber, admin_note as adminNote, created_at as createdAt, paid_at as paidAt ' +
      'FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json(records);
  } catch (error) {
    logger.error(error, 'Error fetching user withdrawal history');
    return res.status(500).json({ error: 'Failed to retrieve withdrawal history.' });
  }
};

// 3. GET /api/admin/withdrawals
export const getAdminWithdrawals = async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let sql = `
      SELECT w.id, w.withdrawal_id as withdrawalId, w.amount, w.payment_method as paymentMethod, 
             w.upi_id as upiId, w.account_holder_name as accountHolderName, w.account_number as accountNumber, 
             w.ifsc_code as ifscCode, w.status, w.utr_number as utrNumber, w.rejection_reason as rejectionReason,
             w.admin_note as adminNote, w.created_at as createdAt, w.paid_at as paidAt, w.updated_at as updatedAt,
             u.name as userName, u.phone as userPhone, u.role as userRole, w.user_id as userId,
             w.processed_by_admin_id as processedByAdminId, a.name as processedByAdminName
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      LEFT JOIN users a ON w.processed_by_admin_id = a.id
    `;
    const params = [];

    sql += " WHERE 1=1";

    if (status && status !== 'ALL') {
      if (status === 'PENDING') {
        sql += ' AND w.status IN ("PENDING", "PROCESSING")';
      } else if (status === 'COMPLETED') {
        sql += ' AND w.status IN ("PAID", "APPROVED")';
      } else {
        sql += ' AND w.status = ?';
        params.push(status);
      }
    }

    if (search && search.trim() !== '') {
      sql += ' AND (w.withdrawal_id LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)';
      const searchWild = `%${search.trim()}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    sql += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const dbRecords = await query(sql, params);
    const records = Array.isArray(dbRecords) ? dbRecords : [];

    // Map each record defensively to resolve aggregates in isolated try/catch blocks
    const recordsWithStats = await Promise.all(
      records.map(async (rec) => {
        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let totalWagers = 0;

        try {
          const depRes = await query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ? AND status = 'completed'",
            [rec.userId]
          );
          totalDeposits = parseFloat(depRes[0]?.total || 0);
        } catch (err) {
          logger.error(err, `Failed to query totalDeposits for user ${rec.userId}`);
        }

        try {
          const wdRes = await query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND status = 'PAID'",
            [rec.userId]
          );
          totalWithdrawals = parseFloat(wdRes[0]?.total || 0);
        } catch (err) {
          logger.error(err, `Failed to query totalWithdrawals for user ${rec.userId}`);
        }

        try {
          const betsRes = await query(
            "SELECT COALESCE(SUM(bet_amount), 0) as total FROM bets WHERE user_id = ?",
            [rec.userId]
          );
          totalWagers = parseFloat(betsRes[0]?.total || 0);
        } catch (err) {
          logger.error(err, `Failed to query totalWagers for user ${rec.userId}`);
        }

        return {
          ...rec,
          totalDeposits,
          totalWithdrawals,
          totalWagers
        };
      })
    );

    let countSql = `
      SELECT COUNT(*) as total 
      FROM withdrawals w 
      JOIN users u ON w.user_id = u.id 
    `;
    const countParams = [];

    countSql += " WHERE 1=1";

    if (status && status !== 'ALL') {
      if (status === 'PENDING') {
        countSql += ' AND w.status IN ("PENDING", "PROCESSING")';
      } else if (status === 'COMPLETED') {
        countSql += ' AND w.status IN ("PAID", "APPROVED")';
      } else {
        countSql += ' AND w.status = ?';
        countParams.push(status);
      }
    }
    if (search && search.trim() !== '') {
      countSql += ' AND (w.withdrawal_id LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)';
      const searchWild = `%${search.trim()}%`;
      countParams.push(searchWild, searchWild, searchWild);
    }

    const totalRes = await query(countSql, countParams);
    const total = totalRes[0]?.total || 0;

    return res.json(recordsWithStats);

  } catch (error) {
    logger.error(error, 'Error fetching administrative withdrawals list');
    return res.status(200).json([]);
  }
};

// 4. PATCH /api/admin/withdrawals/:id/processing
export const processWithdrawal = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [records] = await connection.query(
      'SELECT id, status, processed_by_admin_id FROM withdrawals WHERE id = ? FOR UPDATE',
      [id]
    );

    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    const withdrawal = records[0];

    if (withdrawal.status !== 'PENDING') {
      await connection.rollback();
      return res.status(400).json({ 
        error: `Withdrawal request is already in ${withdrawal.status} status.` 
      });
    }

    await connection.query(
      'UPDATE withdrawals SET status = "PROCESSING", processed_by_admin_id = ? WHERE id = ?',
      [req.user.id, id]
    );

    logger.info(`Withdrawal request marked as PROCESSING: ID ${id} by Admin ID ${req.user.id}`);

    await connection.commit();
    return res.json({ 
      message: 'Withdrawal request locked and status set to PROCESSING.', 
      status: 'PROCESSING',
      processedByAdminId: req.user.id
    });

  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Error in processWithdrawal transaction');
    return res.status(500).json({ error: 'Failed to initiate processing state.' });
  } finally {
    connection.release();
  }
};

// 5. PUT /api/admin/withdrawals/:id/approve
export const approveWithdrawal = async (req, res) => {
  const { id } = req.params;
  const { utrNumber, adminNote } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Lock withdrawal record
    const [records] = await connection.query(
      'SELECT id, status, user_id, amount, withdrawal_id FROM withdrawals WHERE id = ? FOR UPDATE',
      [id]
    );

    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    if (!utrNumber || utrNumber.trim() === '') {
      await connection.rollback();
      return res.status(400).json({ error: 'UTR / Transaction Reference number is required to approve withdrawal.' });
    }

    const [utrCheck] = await connection.query(
      'SELECT id FROM withdrawals WHERE utr_number = ? AND id != ? LIMIT 1',
      [utrNumber.trim(), id]
    );
    if (utrCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'This UTR number has already been used for another payout.' });
    }

    const withdrawal = records[0];
    if (!['PENDING', 'PROCESSING', 'APPROVED'].includes(withdrawal.status)) {
      await connection.rollback();
      return res.status(400).json({ error: `Cannot approve withdrawal request in ${withdrawal.status} status.` });
    }

    // D. Lock wallet record
    const [wallets] = await connection.query(
      'SELECT id, locked_balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [withdrawal.user_id]
    );

    if (wallets.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const wallet = wallets[0];
    const amount = parseFloat(withdrawal.amount);
    const processingFee = calculateWithdrawalFee(amount);
    const totalDebitAmount = amount + processingFee;

    // E. Permanently release/deduct from locked_balance
    const newLocked = parseFloat(Math.max(0, parseFloat(wallet.locked_balance) - totalDebitAmount).toFixed(2));

    await connection.query(
      'UPDATE wallets SET locked_balance = ? WHERE user_id = ?',
      [newLocked, withdrawal.user_id]
    );

    // F. Transition status to PAID (completed)
    await connection.query(
      'UPDATE withdrawals SET status = "PAID", utr_number = ?, admin_note = ?, processed_by_admin_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?',
      [utrNumber.trim(), adminNote || 'Approved successfully.', req.user.id, id]
    );

    logger.info(`Withdrawal request PAID/APPROVED: ${withdrawal.withdrawal_id} by Admin ID ${req.user.id} (UTR: ${utrNumber})`);

    // Dynamic Wallet Notification inside the transaction
    await createNotification(
      withdrawal.user_id,
      'Withdrawal Paid',
      `Your withdrawal request ${withdrawal.withdrawal_id} of ₹${amount.toFixed(2)} has been successfully processed and paid (UTR: ${utrNumber}).`,
      'WALLET',
      connection
    );

    await connection.commit();
    return res.json({ message: 'Withdrawal marked as paid & approved successfully.', status: 'PAID' });

  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Error in approveWithdrawal transaction');
    return res.status(500).json({ error: 'Failed to process approval transaction.' });
  } finally {
    connection.release();
  }
};

// 6. POST /api/admin/withdrawals/:id/reject
export const rejectWithdrawal = async (req, res) => {
  const { id } = req.params;
  const { rejectionReason, predefinedReason } = req.body;

  if ((!rejectionReason || rejectionReason.trim() === '') && (!predefinedReason || predefinedReason.trim() === '')) {
    return res.status(400).json({ error: 'Rejection reason is required to reject withdrawal.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [records] = await connection.query(
      'SELECT id, status, user_id, amount, withdrawal_id FROM withdrawals WHERE id = ? FOR UPDATE',
      [id]
    );

    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    const withdrawal = records[0];
    if (!['PENDING', 'PROCESSING', 'APPROVED'].includes(withdrawal.status)) {
      await connection.rollback();
      return res.status(400).json({ error: `Cannot reject withdrawal request in ${withdrawal.status} status.` });
    }

    const [wallets] = await connection.query(
      'SELECT id, balance, locked_balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [withdrawal.user_id]
    );

    if (wallets.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const wallet = wallets[0];
    const amount = parseFloat(withdrawal.amount);
    const processingFee = calculateWithdrawalFee(amount);
    const totalDebitAmount = amount + processingFee;

    // Re-credit user balance: locked decreases, balance increases
    const newAvailable = parseFloat((parseFloat(wallet.balance) + totalDebitAmount).toFixed(2));
    const newLocked = parseFloat(Math.max(0, parseFloat(wallet.locked_balance) - totalDebitAmount).toFixed(2));

    await connection.query(
      'UPDATE wallets SET balance = ?, locked_balance = ? WHERE user_id = ?',
      [newAvailable, newLocked, withdrawal.user_id]
    );

    const finalReason = predefinedReason 
      ? (rejectionReason ? `${predefinedReason}: ${rejectionReason}` : predefinedReason)
      : rejectionReason;

    await connection.query(
      'UPDATE withdrawals SET status = "REJECTED", rejection_reason = ?, admin_note = ?, processed_by_admin_id = ? WHERE id = ?',
      [finalReason.trim(), predefinedReason || rejectionReason.trim(), req.user.id, id]
    );

    // Record ledger reversal transactions separately
    const balanceAfterPayoutRefund = parseFloat((wallet.balance + amount).toFixed(2));

    // Refund Net Payout
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "withdrawal", "withdrawals", ?, ?, ?, ?)',
      [withdrawal.user_id, wallet.id, amount, id, wallet.balance, balanceAfterPayoutRefund, `Withdrawal request rejected - re-credited net amount: ${withdrawal.withdrawal_id}`]
    );

    // Refund Processing Fee
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "withdrawal", "withdrawals", ?, ?, ?, ?)',
      [withdrawal.user_id, wallet.id, processingFee, id, balanceAfterPayoutRefund, newAvailable, `Withdrawal request rejected - re-credited processing fee: ${withdrawal.withdrawal_id}`]
    );

    logger.info(`Withdrawal request REJECTED: ${withdrawal.withdrawal_id} by Admin ID ${req.user.id} (Re-credited: ₹${totalDebitAmount})`);

    // Dynamic Wallet Notification inside the transaction
    await createNotification(
      withdrawal.user_id,
      'Withdrawal Rejected',
      `Your withdrawal request ${withdrawal.withdrawal_id} of ₹${amount.toFixed(2)} was rejected. Reason: ${finalReason.trim()}`,
      'WALLET',
      connection
    );

    await connection.commit();
    return res.json({ message: 'Withdrawal request rejected and balance re-credited.', status: 'REJECTED' });

  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Error in rejectWithdrawal transaction');
    return res.status(500).json({ error: 'Failed to reject withdrawal.' });
  } finally {
    connection.release();
  }
};
