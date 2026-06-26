import { query, pool } from '../config/db.js';
import { sendWithdrawalAlert } from '../utils/telegram.js';
import logger from '../utils/logger.js';

// Helper to generate a unique withdrawal ID
const generateWithdrawalId = () => {
  return `WDR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// 1. POST /api/withdraw
export const createWithdrawal = async (req, res) => {
  const { amount, paymentMethod, upiId, accountHolderName, accountNumber, ifscCode } = req.body;

  // Enforce validation
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Valid amount is required.' });
  }

  const withdrawalAmount = parseFloat(amount);
  if (withdrawalAmount < 100.00) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is ₹100.00.' });
  }

  if (!paymentMethod || !['UPI', 'BANK'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Valid payment method (UPI or BANK) is required.' });
  }

  if (paymentMethod === 'UPI' && (!upiId || upiId.trim() === '')) {
    return res.status(400).json({ error: 'UPI ID is required for UPI withdrawals.' });
  }

  if (paymentMethod === 'BANK') {
    if (!accountHolderName || accountHolderName.trim() === '') {
      return res.status(400).json({ error: 'Account holder name is required for bank withdrawals.' });
    }
    if (!accountNumber || accountNumber.trim() === '') {
      return res.status(400).json({ error: 'Account number is required for bank withdrawals.' });
    }
    if (!ifscCode || ifscCode.trim() === '') {
      return res.status(400).json({ error: 'IFSC code is required for bank withdrawals.' });
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
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const wallet = wallets[0];
    const availableBalance = parseFloat(wallet.balance);

    // B. Check for existing pending withdrawals to block duplicates
    const [pending] = await connection.query(
      'SELECT id FROM withdrawals WHERE user_id = ? AND status = "PENDING" FOR UPDATE',
      [req.user.id]
    );

    if (pending.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'You already have a pending withdrawal request.' });
    }

    // C. Check sufficient available balance
    if (availableBalance < withdrawalAmount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient available balance.' });
    }

    // D. Transition balance: subtract from balance, add to locked_balance
    const newAvailable = parseFloat((availableBalance - withdrawalAmount).toFixed(2));
    const newLocked = parseFloat((parseFloat(wallet.locked_balance) + withdrawalAmount).toFixed(2));

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

    // Record transaction in ledger (wallet_transactions)
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "withdrawal", "withdrawals", ?, ?, ?, ?)',
      [req.user.id, wallet.id, -withdrawalAmount, insertResult.insertId, availableBalance, newAvailable, `Withdrawal request initiated: ${withdrawalId}`]
    );

    // Write log
    logger.info(`Withdrawal request created: ${withdrawalId} for User ID ${req.user.id} (amount: ₹${withdrawalAmount})`);

    await connection.commit();

    // F. Trigger Telegram alert asynchronously
    sendWithdrawalAlert({
      withdrawalId,
      name: req.user.name,
      amount: withdrawalAmount,
      paymentMethod,
      upiId: paymentMethod === 'UPI' ? upiId.trim() : null,
      accountHolderName: paymentMethod === 'BANK' ? accountHolderName.trim() : null,
      accountNumber: paymentMethod === 'BANK' ? accountNumber.trim() : null,
      ifscCode: paymentMethod === 'BANK' ? ifscCode.trim() : null
    });

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
    return res.status(500).json({ error: 'Internal server error processing withdrawal.' });
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

// 3. GET /api/admin/withdrawals (Status filtering and search)
export const getAdminWithdrawals = async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let sql = `
      SELECT w.id, w.withdrawal_id as withdrawalId, w.amount, w.payment_method as paymentMethod, 
             w.upi_id as upiId, w.account_holder_name as accountHolderName, w.account_number as accountNumber, 
             w.ifsc_code as ifscCode, w.status, w.utr_number as utrNumber, w.admin_note as adminNote, 
             w.created_at as createdAt, w.paid_at as paidAt, u.name as userName, u.phone as userPhone
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Dynamic status filter
    if (status && status !== 'ALL') {
      sql += ' AND w.status = ?';
      params.push(status);
    }

    // Dynamic search indexing
    if (search && search.trim() !== '') {
      sql += ' AND (w.withdrawal_id LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)';
      const searchWild = `%${search.trim()}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    sql += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const records = await query(sql, params);

    // Count query for pagination totals
    let countSql = `
      SELECT COUNT(*) as total 
      FROM withdrawals w 
      JOIN users u ON w.user_id = u.id 
      WHERE 1=1
    `;
    const countParams = [];

    if (status && status !== 'ALL') {
      countSql += ' AND w.status = ?';
      countParams.push(status);
    }
    if (search && search.trim() !== '') {
      countSql += ' AND (w.withdrawal_id LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)';
      const searchWild = `%${search.trim()}%`;
      countParams.push(searchWild, searchWild, searchWild);
    }

    const totalRes = await query(countSql, countParams);
    const total = totalRes[0]?.total || 0;

    return res.json({
      records,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    logger.error(error, 'Error fetching administrative withdrawals list');
    return res.status(500).json({ error: 'Failed to retrieve withdrawals.' });
  }
};

// 4. PUT /api/admin/withdrawals/:id/approve
export const approveWithdrawal = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock withdrawal record
    const [records] = await connection.query(
      'SELECT id, status, withdrawal_id FROM withdrawals WHERE id = ? FOR UPDATE',
      [id]
    );

    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    const withdrawal = records[0];
    if (withdrawal.status !== 'PENDING') {
      await connection.rollback();
      return res.status(400).json({ error: `Withdrawal request must be PENDING (current status: ${withdrawal.status}).` });
    }

    // Transition status to APPROVED
    await connection.query(
      'UPDATE withdrawals SET status = "APPROVED" WHERE id = ?',
      [id]
    );

    logger.info(`Withdrawal request APPROVED: ${withdrawal.withdrawal_id} by Admin ID ${req.user.id}`);

    await connection.commit();
    return res.json({ message: 'Withdrawal request approved successfully.', status: 'APPROVED' });

  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Error in approveWithdrawal transaction');
    return res.status(500).json({ error: 'Failed to approve withdrawal.' });
  } finally {
    connection.release();
  }
};

// 5. PUT /api/admin/withdrawals/:id/reject
export const rejectWithdrawal = async (req, res) => {
  const { id } = req.params;
  const { adminNote } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock withdrawal record
    const [records] = await connection.query(
      'SELECT id, status, user_id, amount, withdrawal_id FROM withdrawals WHERE id = ? FOR UPDATE',
      [id]
    );

    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    const withdrawal = records[0];
    if (!['PENDING', 'APPROVED'].includes(withdrawal.status)) {
      await connection.rollback();
      return res.status(400).json({ error: `Cannot reject withdrawal request in ${withdrawal.status} status.` });
    }

    // Lock wallet record
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

    // Re-credit user balance: locked decreases, balance increases
    const newAvailable = parseFloat((parseFloat(wallet.balance) + amount).toFixed(2));
    const newLocked = parseFloat(Math.max(0, parseFloat(wallet.locked_balance) - amount).toFixed(2));

    await connection.query(
      'UPDATE wallets SET balance = ?, locked_balance = ? WHERE user_id = ?',
      [newAvailable, newLocked, withdrawal.user_id]
    );

    // Update status to REJECTED
    await connection.query(
      'UPDATE withdrawals SET status = "REJECTED", admin_note = ? WHERE id = ?',
      [adminNote || 'Rejected by Administrator.', id]
    );

    // Record reversal transaction in ledger (wallet_transactions)
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "withdrawal", "withdrawals", ?, ?, ?, ?)',
      [withdrawal.user_id, wallet.id, amount, id, wallet.balance, newAvailable, `Withdrawal request rejected - re-credited: ${withdrawal.withdrawal_id}`]
    );

    logger.info(`Withdrawal request REJECTED: ${withdrawal.withdrawal_id} (Re-credited: ₹${amount})`);

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

// 6. PUT /api/admin/withdrawals/:id/mark-paid
export const markPaidWithdrawal = async (req, res) => {
  const { id } = req.params;
  const { utrNumber, adminNote } = req.body;

  if (!utrNumber || utrNumber.trim() === '') {
    return res.status(400).json({ error: 'UTR / Transaction Reference number is required to mark as paid.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock withdrawal record
    const [records] = await connection.query(
      'SELECT id, status, user_id, amount, withdrawal_id FROM withdrawals WHERE id = ? FOR UPDATE',
      [id]
    );

    if (records.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    const withdrawal = records[0];
    if (!['PENDING', 'APPROVED'].includes(withdrawal.status)) {
      await connection.rollback();
      return res.status(400).json({ error: `Cannot mark withdrawal as paid in ${withdrawal.status} status.` });
    }

    // Lock wallet record
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

    // Permanently release/deduct from locked_balance
    const newLocked = parseFloat(Math.max(0, parseFloat(wallet.locked_balance) - amount).toFixed(2));

    await connection.query(
      'UPDATE wallets SET locked_balance = ? WHERE user_id = ?',
      [newLocked, withdrawal.user_id]
    );

    // Transition status to PAID
    await connection.query(
      'UPDATE withdrawals SET status = "PAID", utr_number = ?, admin_note = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?',
      [utrNumber.trim(), adminNote || 'Paid successfully.', id]
    );

    logger.info(`Withdrawal request PAID: ${withdrawal.withdrawal_id} (UTR: ${utrNumber})`);

    await connection.commit();
    return res.json({ message: 'Withdrawal marked as paid successfully.', status: 'PAID' });

  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Error in markPaidWithdrawal transaction');
    return res.status(500).json({ error: 'Failed to process paid transition.' });
  } finally {
    connection.release();
  }
};
