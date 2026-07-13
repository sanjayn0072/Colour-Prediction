import crypto from 'crypto';
import logger from '../utils/logger.js';
import { query, pool } from '../config/db.js';
import { ioInstance } from './gameController.js';
import { createNotification } from '../utils/notifier.js';
import { getCouponSplit, processReferralReward } from './depositController.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'cplay_jwt_secret') {
  throw new Error('FATAL: JWT_SECRET environment variable is missing, undefined, or set to insecure default fallback.');
}

export const calculateWithdrawalFee = (amount) => {
  let fee = 0;
  if (amount === 100) {
    fee = 9;
  } else if (amount > 100 && amount <= 1000) {
    fee = 9 + (amount - 100) * 0.03;
  } else if (amount > 1000) {
    fee = amount * 0.03;
  }
  return parseFloat(fee.toFixed(2));
};

export const handleWithdrawal = async (req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Valid withdrawal amount is required' });
  }

  const withdrawAmount = parseInt(amount, 10);

  if (withdrawAmount < 100 || withdrawAmount > 5000) {
    return res.status(400).json({ error: 'Withdrawal amount must be between ₹100 and ₹5,000' });
  }

  const fee = calculateWithdrawalFee(withdrawAmount);
  const totalDeduction = Number(withdrawAmount) + Number(fee);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock user's wallet for update
    const [wallets] = await connection.query(
      'SELECT id, balance, required_wager FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );

    if (!wallets || wallets.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBalance = parseFloat(wallets[0].balance);
    const requiredWager = parseFloat(wallets[0].required_wager || 0);

    if (requiredWager > 0) {
      await connection.rollback();
      return res.status(400).json({
        error: 'Wagering requirement not met',
        message: `You must complete a total settled wager of ₹${requiredWager.toFixed(2)} before initiating a withdrawal.`
      });
    }

    if (currentBalance < totalDeduction) {
      await connection.rollback();
      return res.status(400).json({
        error: 'insufficient balance',
        message: `Your account balance must be at least ₹${totalDeduction.toFixed(2)} (including a fee of ₹${fee.toFixed(2)}).`
      });
    }

    const newBalance = parseFloat((currentBalance - totalDeduction).toFixed(4));

    // 2. Deduct amount from wallet
    await connection.query(
      'UPDATE wallets SET balance = ? WHERE user_id = ?',
      [newBalance, req.user.id]
    );

    // 3. Find linked payment method
    const [paymentMethods] = await connection.query(
      'SELECT id FROM payment_methods WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const paymentMethodId = paymentMethods[0]?.id || null;

    if (!paymentMethodId) {
      await connection.rollback();
      return res.status(400).json({ error: 'Please link a bank account or UPI detail before withdrawing.' });
    }

    // 4. Create withdrawal record
    const [withdrawResult] = await connection.query(
      'INSERT INTO withdrawals (user_id, payment_method_id, amount, fee, status) VALUES (?, ?, ?, ?, "pending")',
      [req.user.id, paymentMethodId, withdrawAmount, fee]
    );
    const withdrawalId = withdrawResult.insertId;

    // 5. Write to ledger (wallet_transactions) in separate payout and fee rows
    const balanceAfterPayout = parseFloat((currentBalance - withdrawAmount).toFixed(4));
    
    // Payout Net Payout
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "withdrawal", "withdrawals", ?, ?, ?, ?)',
      [req.user.id, wallets[0].id, -withdrawAmount, withdrawalId, currentBalance, balanceAfterPayout, `Withdrawal net amount payout: WITHDRAW-${withdrawalId}`]
    );

    // Processing Fee
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "withdrawal", "withdrawals", ?, ?, ?, ?)',
      [req.user.id, wallets[0].id, -fee, withdrawalId, balanceAfterPayout, newBalance, `Withdrawal processing fee debit: WITHDRAW-${withdrawalId}`]
    );

    // 6. Update user statistics aggregates
    await connection.query(
      'UPDATE user_stats SET total_withdrawals = total_withdrawals + ? WHERE user_id = ?',
      [withdrawAmount, req.user.id]
    );

    await connection.commit();

    return res.json({
      message: 'Withdrawal successful',
      withdrawal: {
        amount: withdrawAmount,
        fee,
        totalDeduction,
        status: 'Processing',
        referenceId: `WITHDRAW-${withdrawalId}`
      },
      walletBalance: newBalance
    });
  } catch (error) {
    await connection.rollback();
    logger.error(error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    connection.release();
  }
};

export const linkBank = async (req, res) => {
  const { accountNumber, ifsc, bankName, qrCodeUrl, isDefault } = req.body;

  if (!accountNumber || !ifsc || !bankName) {
    return res.status(400).json({ error: 'All bank details are required.' });
  }

  try {
    // Delete existing bank config if any to keep 1 payment method per user for simple demo
    await query('DELETE FROM payment_methods WHERE user_id = ? AND type = "bank"', [req.user.id]);

    await query(
      'INSERT INTO payment_methods (user_id, type, account_name, account_number, ifsc_code, qr_code_url, is_default) VALUES (?, "bank", ?, ?, ?, ?, ?)',
      [req.user.id, req.user.name, accountNumber, ifsc, qrCodeUrl || null, isDefault ? 1 : 0]
    );

    return res.json({ message: 'Bank account linked successfully' });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

export const linkUpi = async (req, res) => {
  const { upiId, qrCodeUrl, isDefault } = req.body;

  if (!upiId) {
    return res.status(400).json({ error: 'UPI ID is required.' });
  }

  try {
    // Delete existing upi config if any
    await query('DELETE FROM payment_methods WHERE user_id = ? AND type = "upi"', [req.user.id]);

    await query(
      'INSERT INTO payment_methods (user_id, type, account_name, upi_id, qr_code_url, is_default) VALUES (?, "upi", ?, ?, ?, ?)',
      [req.user.id, req.user.name, upiId, qrCodeUrl || null, isDefault ? 1 : 0]
    );

    return res.json({ message: 'UPI ID linked successfully' });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

export const deposit = async (req, res) => {
  const { amount, transactionId, signature, voucher } = req.body;
  
  if (!amount || isNaN(amount) || !transactionId || !signature) {
    return res.status(400).json({ error: 'Deposit parameters are missing or invalid' });
  }

  const depositAmount = parseFloat(amount);
  if (depositAmount <= 0) {
    return res.status(400).json({ error: 'Deposit amount must be positive' });
  }

  const secret = process.env.JWT_SECRET;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${depositAmount}:${transactionId}`)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Security alert: Payment signature verification failed' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock user's wallet
    const [wallets] = await connection.query(
      'SELECT id, balance, bonus_balance, required_wager, required_bonus_wager FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );

    if (!wallets || wallets.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Determine coupon code/percent
    let rewardAmount = 0;
    let cashReward = 0;
    let bonusReward = 0;

    if (voucher) {
      const voucherCode = typeof voucher === 'object' ? voucher.id : voucher;
      const vUpper = String(voucherCode || '').toUpperCase().trim();
      
      // Let's check if there is a matching coupon in DB first to get its reward_amount
      const [coupons] = await connection.query('SELECT reward_amount FROM coupons WHERE code = ? LIMIT 1', [vUpper]);
      if (coupons && coupons.length > 0) {
        rewardAmount = parseFloat(coupons[0].reward_amount);
      }

      const split = getCouponSplit(vUpper, rewardAmount, depositAmount);
      cashReward = split.cashReward;
      bonusReward = split.bonusReward;
    }

    const currentBalance = parseFloat(wallets[0].balance || 0);
    const currentBonusBalance = parseFloat(wallets[0].bonus_balance || 0);
    const currentRequiredWager = parseFloat(wallets[0].required_wager || 0);
    const currentRequiredBonusWager = parseFloat(wallets[0].required_bonus_wager || 0);

    const newBalance = parseFloat((currentBalance + depositAmount + cashReward).toFixed(2));
    const newBonusBalance = parseFloat((currentBonusBalance + bonusReward).toFixed(2));
    const newRequiredWager = parseFloat((currentRequiredWager + depositAmount + cashReward).toFixed(2));
    const newRequiredBonusWager = parseFloat((currentRequiredBonusWager + bonusReward * 10).toFixed(2));

    // 2. Update wallet balances
    await connection.query(
      'UPDATE wallets SET balance = ?, bonus_balance = ?, required_wager = ?, required_bonus_wager = ? WHERE user_id = ?',
      [newBalance, newBonusBalance, newRequiredWager, newRequiredBonusWager, req.user.id]
    );

    // If bonus is active, write to bonuses table
    if (bonusReward > 0) {
      await connection.query(
        'INSERT INTO bonuses (user_id, type, amount, status) VALUES (?, "coupon", ?, "claimed")',
        [req.user.id, bonusReward]
      );
    }

    // 3. Find payment method
    const [paymentMethods] = await connection.query(
      'SELECT id FROM payment_methods WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const paymentMethodId = paymentMethods[0]?.id || null;

    // 4. Create deposit record
    const [depositResult] = await connection.query(
      'INSERT INTO deposits (user_id, payment_method_id, amount, transaction_id, status) VALUES (?, ?, ?, ?, "completed")',
      [req.user.id, paymentMethodId, depositAmount, transactionId]
    );
    const depositId = depositResult.insertId;

    // 5. Write to ledger (wallet_transactions)
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "deposit", "deposits", ?, ?, ?, ?)',
      [req.user.id, wallets[0].id, depositAmount, depositId, currentBalance, currentBalance + depositAmount, `Completed deposit of ₹${depositAmount} (Txn: ${transactionId})`]
    );

    // Write to ledger for coupon cash reward if applicable
    if (cashReward > 0) {
      await connection.query(
        'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
        'VALUES (?, ?, ?, "bonus_claim", "deposits", ?, ?, ?, ?)',
        [req.user.id, wallets[0].id, cashReward, depositId, currentBalance + depositAmount, newBalance, `Applied coupon cash reward: ${voucher}`]
      );
    }

    // 6. Update user stats
    await connection.query(
      'UPDATE user_stats SET total_deposits = total_deposits + ?, total_bonus_claimed = total_bonus_claimed + ? WHERE user_id = ?',
      [depositAmount, cashReward + bonusReward, req.user.id]
    );

    // Process referral commission reward for the referrer if applicable
    await processReferralReward(connection, req.user.id);

    // Dynamic Wallet Notification inside the active transaction
    await createNotification(
      req.user.id,
      'Wallet Recharged!',
      `Wallet Recharged! ₹${depositAmount} added.`,
      'WALLET',
      connection
    );

    await connection.commit();

    return res.json({ 
      message: 'Deposit successful', 
      walletBalance: newBalance 
    });
  } catch (err) {
    await connection.rollback();
    logger.error(err);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    connection.release();
  }
};

export const createDepositOrder = async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Amount is required' });
  }
  const depositAmount = parseFloat(amount);
  const transactionId = `DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const secret = process.env.JWT_SECRET;
  const signature = crypto.createHmac('sha256', secret).update(`${depositAmount}:${transactionId}`).digest('hex');
  return res.json({ amount: depositAmount, transactionId, signature });
};

export const getTransactions = async (req, res) => {
  try {
    const transactions = await query(
      'SELECT id, amount, type, reference_table as referenceTable, reference_id as referenceId, balance_before as balanceBefore, balance_after as balanceAfter, balance_after as runningBalance, description, created_at as createdAt ' +
      'FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    return res.json(transactions);
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

export const deletePaymentMethod = async (req, res) => {
  const { type } = req.params;
  if (type !== 'bank' && type !== 'upi') {
    return res.status(400).json({ error: 'Invalid payment method type.' });
  }
  try {
    await query('DELETE FROM payment_methods WHERE user_id = ? AND type = ?', [req.user.id, type]);
    return res.json({ message: 'Payment method deleted successfully' });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

export const claimVipReward = async (req, res) => {
  const { vipLevel, rewardType, amount } = req.body;

  if (vipLevel === undefined || !rewardType || amount === undefined || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid parameters: vipLevel, rewardType and valid amount are required.' });
  }

  const rewardAmount = parseFloat(amount);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check if the user has already claimed this specific reward combination
    const [existing] = await connection.query(
      'SELECT 1 FROM bonuses b ' +
      'JOIN vip_bonus_details v ON b.id = v.bonus_id ' +
      'WHERE b.user_id = ? AND v.vip_level = ? AND v.reward_type = ? LIMIT 1',
      [req.user.id, vipLevel, rewardType]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Reward already claimed' });
    }

    // 2. Lock user's wallet for update
    const [wallets] = await connection.query(
      'SELECT id, balance, bonus_balance, required_wager FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );

    if (!wallets || wallets.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBonusBalance = parseFloat(wallets[0].bonus_balance || 0);
    const currentRequiredWager = parseFloat(wallets[0].required_wager || 0);

    // Compute new bonus and wagering turnover
    const mult = 12; // VIP multiplier is 12
    const newBonusBalance = parseFloat((currentBonusBalance + rewardAmount).toFixed(4));
    const newRequiredWager = parseFloat((currentRequiredWager + rewardAmount * mult).toFixed(4));

    // Update wallet
    await connection.query(
      'UPDATE wallets SET bonus_balance = ?, required_wager = ? WHERE user_id = ?',
      [newBonusBalance, newRequiredWager, req.user.id]
    );

    // 3. Write record to bonuses table
    const [bonusResult] = await connection.query(
      'INSERT INTO bonuses (user_id, type, amount, status) VALUES (?, "vip", ?, "claimed")',
      [req.user.id, rewardAmount]
    );
    const bonusId = bonusResult.insertId;

    // 4. Write record to vip_bonus_details table
    const monthlyReward = rewardType === 'monthly' ? rewardAmount : 0;
    const weeklyReward = rewardType === 'weekly' ? rewardAmount : 0;
    const levelUpReward = rewardType === 'levelUp' ? rewardAmount : 0;
    await connection.query(
      'INSERT INTO vip_bonus_details (bonus_id, vip_level, reward_type, monthly_reward, weekly_reward, level_up_reward) VALUES (?, ?, ?, ?, ?, ?)',
      [bonusId, vipLevel, rewardType, monthlyReward, weeklyReward, levelUpReward]
    );

    // 5. Write to ledger (wallet_transactions)
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "bonus_claim", "bonuses", ?, ?, ?, ?)',
      [req.user.id, wallets[0].id, rewardAmount, bonusId, currentBonusBalance, newBonusBalance, `Claimed VIP Level ${vipLevel} ${rewardType} reward`]
    );

    // 6. Update user stats
    await connection.query(
      'UPDATE user_stats SET total_bonus_claimed = total_bonus_claimed + ? WHERE user_id = ?',
      [rewardAmount, req.user.id]
    );

    await connection.commit();

    return res.json({
      message: 'VIP reward claimed successfully',
      bonusBalance: newBonusBalance,
      requiredWager: newRequiredWager
    });
  } catch (err) {
    await connection.rollback();
    logger.error(err);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    connection.release();
  }
};
