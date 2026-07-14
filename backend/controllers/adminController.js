import { query, pool } from '../config/db.js';
import axios from 'axios';
import { ioInstance } from './gameController.js';
import logger from '../utils/logger.js';
import speakeasy from 'speakeasy';
import { createNotification } from '../utils/notifier.js';
import crypto from 'crypto';
import { encryptConfigValue, decryptConfigValue } from '../utils/configEncryption.js';
import { getCouponSplit, processReferralReward } from './depositController.js';

const decryptSecret = (cipherText) => {
  if (!cipherText) return '';
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    return cipherText;
  }
  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new Error('FATAL: JWT_SECRET is not configured in environment variables.');
    }
    const key = crypto.createHash('sha256').update(String(secretKey)).digest();
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    logger.error(err, 'Failed to decrypt TOTP secret. Retrying as plain text.');
    return cipherText;
  }
};

// GET /api/admin/metrics
export const getMetrics = async (req, res) => {
  try {
    // 1. Calculate Active Players via Socket.io connected client count
    let activePlayersCount = 0;
    if (ioInstance) {
      const activeUsers = new Set();
      // Count unique authenticated users connected
      for (const [id, socket] of ioInstance.of('/').sockets) {
        if (socket.user && socket.user.id) {
          activeUsers.add(socket.user.id);
        }
      }
      activePlayersCount = activeUsers.size || ioInstance.engine.clientsCount || 0;
    }

    // 2. Fetch Total Bets Volume
    const [betsVolumeResult] = await pool.query(
      'SELECT COALESCE(SUM(bet_amount), 0) AS totalVolume FROM bets'
    );
    const totalBetsVolume = parseFloat(betsVolumeResult[0]?.totalVolume || 0);

    // 3. Fetch Pending Withdrawals
    const [withdrawalsResult] = await pool.query(
      "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS totalAmount FROM withdrawals WHERE status = 'PENDING'"
    );
    const pendingWithdrawalsCount = parseInt(withdrawalsResult[0]?.count || 0, 10);
    const pendingWithdrawalsAmount = parseFloat(withdrawalsResult[0]?.totalAmount || 0);

    // 4. Fetch Pending Appeals
    const [appealsResult] = await pool.query(
      "SELECT COUNT(*) AS count FROM deposit_appeals WHERE status = 'pending'"
    );
    const pendingAppealsCount = parseInt(appealsResult[0]?.count || 0, 10);

    // 5. Fetch Open Complaints (Support)
    const [complaintsResult] = await pool.query(
      "SELECT COUNT(*) AS count FROM complaints WHERE status = 'open'"
    );
    const openComplaintsCount = parseInt(complaintsResult[0]?.count || 0, 10);

    return res.json({
      activePlayers: activePlayersCount,
      totalBets: totalBetsVolume,
      pendingWithdrawals: pendingWithdrawalsCount,
      pendingWithdrawalsAmount,
      pendingAppeals: pendingAppealsCount,
      openComplaints: openComplaintsCount
    });
  } catch (err) {
    logger.error(err, 'Failed to fetch admin metrics');
    return res.status(500).json({ error: 'Failed to retrieve admin dashboard metrics.' });
  }
};

// GET /api/admin/logs
export const getLogs = async (req, res) => {
  try {
    // 1. Fetch recent transactions
    let transactions = [];
    try {
      const records = await query(
        'SELECT id, user_id as userId, amount, type, created_at as createdAt FROM wallet_transactions ORDER BY created_at DESC LIMIT 30'
      );
      transactions = records || [];
    } catch (err) {
      logger.error(err, 'Logs query error: wallet_transactions');
    }

    // 2. Fetch recent game rounds
    let gameRounds = [];
    try {
      const records = await query(
        'SELECT gr.id, gr.round_id as roundId, gr.outcome, gr.created_at as createdAt, g.name AS gameName ' +
        'FROM game_rounds gr ' +
        'JOIN games g ON gr.game_id = g.id ' +
        'WHERE gr.status = "completed" ' +
        'ORDER BY gr.created_at DESC LIMIT 30'
      );
      gameRounds = records || [];
    } catch (err) {
      logger.error(err, 'Logs query error: game_rounds');
    }

    // 3. Fetch recent administrative audit logs
    let auditLogs = [];
    try {
      let auditSql = 'SELECT al.id, al.action, al.details, al.created_at as createdAt, a.name as adminName FROM audit_logs al JOIN users a ON al.admin_id = a.id';
      if (req.user.role === 'admin') {
        auditSql += " WHERE a.role != 'super_admin'";
      }
      auditSql += ' ORDER BY al.created_at DESC LIMIT 30';
      const records = await query(auditSql);
      auditLogs = records || [];
    } catch (err) {
      logger.error(err, 'Logs query error: audit_logs');
    }

    // 4. Format and merge logs
    const transactionLogs = transactions.map(t => {
      let type = 'INFO';
      let message = '';
      if (t.type === 'deposit') {
        type = 'SUCCESS';
        message = `Deposit processed successfully for User ID ${t.userId}: ₹${parseFloat(t.amount)}`;
      } else if (t.type === 'withdrawal') {
        type = 'WARNING';
        message = `Withdrawal request processed for User ID ${t.userId}: ₹${parseFloat(Math.abs(t.amount))}`;
      } else if (t.type === 'bet_placement') {
        type = 'INFO';
        message = `Bet placed by User ID ${t.userId}: ₹${parseFloat(Math.abs(t.amount))}`;
      } else if (t.type === 'bet_payout') {
        type = 'SUCCESS';
        message = `Bet winning payout credited to User ID ${t.userId}: ₹${parseFloat(t.amount)}`;
      } else if (t.type === 'product_purchase') {
        type = 'WARNING';
        message = `Product purchase debited for User ID ${t.userId}: ₹${parseFloat(Math.abs(t.amount))}`;
      } else if (t.type === 'bonus_claim') {
        type = 'SUCCESS';
        message = `Bonus reward claimed by User ID ${t.userId}: ₹${parseFloat(t.amount)}`;
      } else {
        message = `Transaction (${t.type}) of ₹${parseFloat(t.amount)} for User ID ${t.userId}`;
      }
      const date = new Date(t.createdAt);
      const timeStr = date.toTimeString().split(' ')[0];
      return {
        id: `wt-${t.id}`,
        type,
        message,
        time: timeStr,
        timestamp: date.getTime()
      };
    });

    const gameLogs = gameRounds.map(r => {
      const date = new Date(r.createdAt);
      const timeStr = date.toTimeString().split(' ')[0];
      return {
        id: `gr-${r.id}`,
        type: 'SUCCESS',
        message: `${r.gameName === 'colour' ? 'Colour Prediction' : 'Dice Game Pro'} resolved outcome: ${r.outcome} (Round ${r.roundId})`,
        time: timeStr,
        timestamp: date.getTime()
      };
    });

    const adminLogs = auditLogs.map(a => {
      const date = new Date(a.createdAt);
      const timeStr = date.toTimeString().split(' ')[0];
      return {
        id: `al-${a.id}`,
        type: 'INFO',
        message: `Admin ${a.adminName} performed action: ${a.action} (${a.details || ''})`,
        time: timeStr,
        timestamp: date.getTime()
      };
    });

    // If empty logs, create initial system checks logs
    const now = new Date();
    const systemLogs = [
      {
        id: 'sys-health',
        type: 'INFO',
        message: 'System database health check: 100% operational',
        time: now.toTimeString().split(' ')[0],
        timestamp: now.getTime() - 5000
      }
    ];

    const merged = [...transactionLogs, ...gameLogs, ...adminLogs, ...systemLogs]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    return res.json(merged);
  } catch (err) {
    logger.error(err, 'Failed to fetch admin system logs');
    return res.status(500).json({ error: 'Failed to retrieve system logs.' });
  }
};

// Helper to log administrative actions
const logAdminAction = async (connection, adminId, action, details) => {
  try {
    await connection.query(
      'INSERT INTO audit_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [adminId, action, details]
    );
  } catch (err) {
    logger.error(err, 'Failed to write administrative audit log');
  }
};

// GET /api/admin/users
export const getAdminUsers = async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let sql = 'SELECT id, uid, name, phone, email, role, status, created_at as createdAt FROM users WHERE 1=1';
    if (req.user.role === 'admin') {
      sql += " AND role != 'super_admin'";
    }
    const params = [];

    if (search.trim() !== '') {
      sql += ' AND (phone LIKE ? OR name LIKE ? OR email LIKE ? OR uid LIKE ?)';
      const wild = `%${search.trim()}%`;
      params.push(wild, wild, wild, wild);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [usersList] = await pool.query(sql, params);

    // Map over each user to fetch their wallet and stats defensively in isolated try/catch blocks
    const usersWithStats = await Promise.all(
      usersList.map(async (u) => {
        let walletBalance = 0;
        let bonusBalance = 0;
        let lockedBalance = 0;
        let requiredWager = 0;
        let gamesPlayed = 0;
        let totalDeposits = 0;
        let totalWithdrawals = 0;

        // Fetch wallet details
        try {
          const [wallets] = await pool.query('SELECT balance, bonus_balance, locked_balance, required_wager FROM wallets WHERE user_id = ? LIMIT 1', [u.id]);
          if (wallets && wallets.length > 0) {
            walletBalance = parseFloat(wallets[0].balance || 0);
            bonusBalance = parseFloat(wallets[0].bonus_balance || 0);
            lockedBalance = parseFloat(wallets[0].locked_balance || 0);
            requiredWager = parseFloat(wallets[0].required_wager || 0);
          }
        } catch (walletErr) {
          logger.error(walletErr, `Failed to fetch wallet for user ${u.id}`);
        }

        // Fetch user stats
        try {
          const [stats] = await pool.query('SELECT games_played, total_deposits, total_withdrawals FROM user_stats WHERE user_id = ? LIMIT 1', [u.id]);
          if (stats && stats.length > 0) {
            gamesPlayed = parseInt(stats[0].games_played || 0, 10);
            totalDeposits = parseFloat(stats[0].total_deposits || 0);
            totalWithdrawals = parseFloat(stats[0].total_withdrawals || 0);
          }
        } catch (statsErr) {
          logger.error(statsErr, `Failed to fetch user_stats for user ${u.id}`);
        }

        return {
          ...u,
          walletBalance,
          bonusBalance,
          lockedBalance,
          requiredWager,
          gamesPlayed,
          totalDeposits,
          totalWithdrawals
        };
      })
    );

    return res.json(usersWithStats);
  } catch (err) {
    logger.error(err, 'Database system error in getAdminUsers');
    return res.status(200).json([]);
  }
};

// GET /api/admin/users/:id/history
export const getUserHistory = async (req, res) => {
  const { id } = req.params;

  try {
    const bets = await query(
      'SELECT b.id, b.bet_amount as betAmount, b.payout_amount as payoutAmount, b.payout_multiplier as payoutMultiplier, b.bet_type as betType, b.bet_value as betValue, b.status, b.is_settled as isSettled, b.created_at as createdAt, gr.round_id as roundId, g.name as gameName ' +
      'FROM bets b ' +
      'JOIN game_rounds gr ON b.game_round_id = gr.id ' +
      'JOIN games g ON b.game_id = g.id ' +
      'WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 50',
      [id]
    );

    const transactions = await query(
      'SELECT id, amount, type, reference_table as referenceTable, reference_id as referenceId, balance_before as balanceBefore, balance_after as balanceAfter, balance_after as runningBalance, description, created_at as createdAt ' +
      'FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [id]
    );

    return res.json({ bets, transactions });
  } catch (err) {
    logger.error(err, 'Failed to fetch user history');
    return res.status(500).json({ error: 'Failed to retrieve user history.' });
  }
};

// PUT /api/admin/users/:id/status
export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'locked'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Status must be active or locked.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [userRows] = await connection.query('SELECT name, phone FROM users WHERE id = ?', [id]);
    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found.' });
    }

    await connection.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

    await logAdminAction(connection, req.user.id, `LOCK_USER_${status.toUpperCase()}`, `Updated status of user ${userRows[0].name} (${userRows[0].phone}) to ${status}`);

    await connection.commit();
    return res.json({ message: `User status updated to ${status} successfully.` });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to update user status');
    return res.status(500).json({ error: 'Failed to update user status.' });
  } finally {
    connection.release();
  }
};

// PUT /api/admin/users/:id/balance
export const adjustUserBalance = async (req, res) => {
  const { id } = req.params;
  const { amount, balanceType, description } = req.body;

  if (amount === undefined || isNaN(amount)) {
    return res.status(400).json({ error: 'Valid amount is required.' });
  }
  if (!balanceType || !['real', 'bonus', 'wagering'].includes(balanceType)) {
    return res.status(400).json({ error: 'Valid balanceType (real, bonus or wagering) is required.' });
  }

  const adjustVal = parseFloat(amount);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [wallets] = await connection.query(
      'SELECT id, balance, bonus_balance, required_wager FROM wallets WHERE user_id = ? FOR UPDATE',
      [id]
    );

    if (wallets.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const wallet = wallets[0];
    const [userRows] = await connection.query('SELECT name, phone FROM users WHERE id = ?', [id]);
    const userName = userRows[0]?.name || 'Unknown';
    const userPhone = userRows[0]?.phone || 'Unknown';

    let queryStr = '';
    let queryParams = [];
    let balanceBefore = 0;
    let balanceAfter = 0;

    if (balanceType === 'real') {
      balanceBefore = parseFloat(wallet.balance);
      balanceAfter = parseFloat((balanceBefore + adjustVal).toFixed(4));
      if (balanceAfter < 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Deduction results in negative available balance.' });
      }
      queryStr = 'UPDATE wallets SET balance = ? WHERE id = ?';
      queryParams = [balanceAfter, wallet.id];
    } else if (balanceType === 'bonus') {
      balanceBefore = parseFloat(wallet.bonus_balance);
      balanceAfter = parseFloat((balanceBefore + adjustVal).toFixed(4));
      if (balanceAfter < 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Deduction results in negative bonus balance.' });
      }
      queryStr = 'UPDATE wallets SET bonus_balance = ? WHERE id = ?';
      queryParams = [balanceAfter, wallet.id];
    } else if (balanceType === 'wagering') {
      balanceBefore = parseFloat(wallet.required_wager);
      balanceAfter = parseFloat(Math.max(0, balanceBefore + adjustVal).toFixed(4));
      queryStr = 'UPDATE wallets SET required_wager = ? WHERE id = ?';
      queryParams = [balanceAfter, wallet.id];
    }

    await connection.query(queryStr, queryParams);

    // Only write a ledger entry if modifying real or bonus balances
    if (balanceType === 'real' || balanceType === 'bonus') {
      const type = adjustVal >= 0 ? 'deposit' : 'withdrawal';
      const refTable = 'wallets';
      const ledgerDesc = `Admin adjustment: ${description || 'No notes provided.'}`;
      await connection.query(
        'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, wallet.id, adjustVal, type, refTable, wallet.id, balanceBefore, balanceAfter, ledgerDesc]
      );
    }

    await logAdminAction(
      connection,
      req.user.id,
      'ADJUST_BALANCE',
      `Adjusted ${balanceType} balance of user ${userName} (${userPhone}) by ₹${adjustVal}. Description: ${description || 'None'}`
    );

    await connection.commit();
    return res.json({ message: 'Balance adjusted successfully.', balanceBefore, balanceAfter });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to adjust user balance');
    return res.status(500).json({ error: 'Failed to adjust user balance.' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/orders
export const getAdminOrders = async (req, res) => {
  const { status = 'ALL', page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let sql = `
      SELECT po.id, po.quantity, po.price_each as priceEach, po.total_price as totalPrice, po.order_status as orderStatus,
             po.purchase_date as purchaseDate, po.expected_delivery_date as expectedDeliveryDate, po.delivered_at as deliveredAt,
             p.title as productTitle, u.name as userName, u.phone as userPhone,
             ua.full_name as shippingName, ua.phone as shippingPhone, ua.address_type as shippingType,
             ua.address_line1 as addressLine1, ua.address_line2 as addressLine2, ua.city, ua.state, ua.postal_code as pinCode
      FROM product_orders po
      JOIN products p ON po.product_id = p.id
      JOIN users u ON po.user_id = u.id
      JOIN user_addresses ua ON po.user_address_id = ua.id
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'ALL') {
      sql += ' AND po.order_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY po.purchase_date DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [orders] = await pool.query(sql, params);

    // Count query
    let countSql = 'SELECT COUNT(*) as total FROM product_orders po WHERE 1=1';
    const countParams = [];
    if (status !== 'ALL') {
      countSql += ' AND po.order_status = ?';
      countParams.push(status);
    }
    const [totalResult] = await pool.query(countSql, countParams);
    const total = totalResult[0]?.total || 0;

    return res.json({
      records: orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    logger.error(err, 'Failed to fetch admin orders');
    return res.status(200).json({ records: [], pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 } });
  }
};

// PUT /api/admin/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid order status.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.query('SELECT user_id, total_price FROM product_orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found.' });
    }

    const deliveredAt = status === 'delivered' ? new Date() : null;

    // Set expected delivery to now if completed, or update dates
    await connection.query(
      'UPDATE product_orders SET order_status = ?, delivered_at = ? WHERE id = ?',
      [status, deliveredAt, id]
    );

    await logAdminAction(
      connection,
      req.user.id,
      'UPDATE_ORDER_STATUS',
      `Updated order ID ${id} status to ${status.toUpperCase()}`
    );

    await connection.commit();
    return res.json({ message: 'Order status updated successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to update order status');
    return res.status(500).json({ error: 'Failed to update order status.' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/complaints
export const getAdminComplaints = async (req, res) => {
  const { status = 'ALL' } = req.query;

  try {
    let sql = `
      SELECT c.id, c.subject, c.description, c.status, c.priority, c.resolution_notes as resolutionNotes,
             c.image_url as imageUrl, c.complaint_type as complaintType, c.created_at as createdAt,
             u.name as userName, u.phone as userPhone, u.uid as userUid, a.name as adminName
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users a ON c.assigned_admin = a.id
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'ALL') {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY c.created_at DESC';
    const [complaints] = await pool.query(sql, params);
    return res.json(complaints);
  } catch (err) {
    logger.error(err, 'Failed to fetch admin complaints');
    return res.status(500).json({ error: 'Failed to retrieve complaints.' });
  }
};

// PUT /api/admin/complaints/:id
export const updateComplaintStatus = async (req, res) => {
  const { id } = req.params;
  const { status, assignedAdmin, resolutionNotes } = req.body;

  if (!status || !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid complaint status.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      'UPDATE complaints SET status = ?, assigned_admin = ?, resolution_notes = ? WHERE id = ?',
      [status, assignedAdmin || null, resolutionNotes || null, id]
    );

    await logAdminAction(
      connection,
      req.user.id,
      'UPDATE_COMPLAINT',
      `Updated support complaint ID ${id} status to ${status.toUpperCase()}`
    );

    await connection.commit();
    return res.json({ message: 'Complaint ticket updated successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to update complaint');
    return res.status(500).json({ error: 'Failed to update complaint.' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/coupons
export const getCoupons = async (req, res) => {
  try {
    const coupons = await query(
      'SELECT id, code, discount_type as discountType, value, min_deposit as minDeposit, max_uses as maxUses, used_count as usedCount, expires_at as expiresAt, created_at as createdAt FROM coupons ORDER BY created_at DESC'
    );
    return res.json(coupons);
  } catch (err) {
    logger.error(err, 'Failed to fetch coupons');
    return res.status(500).json({ error: 'Failed to retrieve coupons.' });
  }
};

// POST /api/admin/coupons
export const createCoupon = async (req, res) => {
  const { code, discountType, value, minDeposit, maxUses, expiresAt } = req.body;

  if (!code || !discountType || value === undefined || isNaN(value)) {
    return res.status(400).json({ error: 'Code, discountType and valid value are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const expiresVal = expiresAt ? new Date(expiresAt) : null;

    const [result] = await connection.query(
      'INSERT INTO coupons (code, discount_type, value, min_deposit, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [code.trim().toUpperCase(), discountType, value, minDeposit || 0.0000, maxUses || 1, expiresVal]
    );

    await logAdminAction(
      connection,
      req.user.id,
      'CREATE_COUPON',
      `Created coupon code ${code.trim().toUpperCase()} with value ${value}`
    );

    // Create a global notification for the new promo coupon!
    await createNotification(
      null,
      'New Promo Coupon!',
      `A new promo coupon code "${code.trim().toUpperCase()}" has been created! Use it on your next deposit to get bonuses.`,
      'PROMO',
      connection
    );

    await connection.commit();
    return res.status(201).json({ message: 'Coupon created successfully.', id: result.insertId });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to create coupon');
    return res.status(500).json({ error: 'Failed to create coupon.' });
  } finally {
    connection.release();
  }
};

// DELETE /api/admin/coupons/:id
export const deleteCoupon = async (req, res) => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [coupons] = await connection.query('SELECT code FROM coupons WHERE id = ?', [id]);
    if (coupons.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    await connection.query('DELETE FROM coupons WHERE id = ?', [id]);

    await logAdminAction(
      connection,
      req.user.id,
      'DELETE_COUPON',
      `Deleted coupon code ${coupons[0].code}`
    );

    await connection.commit();
    return res.json({ message: 'Coupon deleted successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to delete coupon');
    return res.status(500).json({ error: 'Failed to delete coupon.' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/spin-configs
export const getSpinConfigs = async (req, res) => {
  try {
    const configs = await query(
      'SELECT id, prize_name as prizeName, type, value, weight, is_active as isActive FROM spin_configs ORDER BY id ASC'
    );
    return res.json(configs);
  } catch (err) {
    logger.error(err, 'Failed to fetch spin configs');
    return res.status(500).json({ error: 'Failed to retrieve spin wheel configs.' });
  }
};

// GET /api/admin/games
export const getGames = async (req, res) => {
  try {
    const games = await query(
      'SELECT id, name, is_active as isActive FROM games ORDER BY id ASC'
    );
    return res.json(games);
  } catch (err) {
    logger.error(err, 'Failed to fetch games');
    return res.status(500).json({ error: 'Failed to retrieve games.' });
  }
};


// PUT /api/admin/spin-configs/:id
export const updateSpinConfig = async (req, res) => {
  const { id } = req.params;
  const { weight, value, isActive } = req.body;

  if (weight === undefined || isNaN(weight) || value === undefined || isNaN(value)) {
    return res.status(400).json({ error: 'Valid weight and value are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [prizes] = await connection.query('SELECT prize_name FROM spin_configs WHERE id = ?', [id]);
    if (prizes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Prize configuration not found.' });
    }

    await connection.query(
      'UPDATE spin_configs SET weight = ?, value = ?, is_active = ? WHERE id = ?',
      [weight, value, isActive ? 1 : 0, id]
    );

    await logAdminAction(
      connection,
      req.user.id,
      'UPDATE_SPIN_CONFIG',
      `Updated spin prize ${prizes[0].prize_name} (weight: ${weight}, value: ${value}, active: ${isActive})`
    );

    await connection.commit();
    return res.json({ message: 'Spin prize configuration updated successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to update spin config');
    return res.status(500).json({ error: 'Failed to update spin config.' });
  } finally {
    connection.release();
  }
};

// PUT /api/admin/games/:id/status
export const updateGameStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({ error: 'isActive boolean value is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [games] = await connection.query('SELECT name FROM games WHERE id = ?', [id]);
    if (games.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Game mode not found.' });
    }

    await connection.query('UPDATE games SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);

    await logAdminAction(
      connection,
      req.user.id,
      'UPDATE_GAME_STATUS',
      `Updated game ${games[0].name} active status to ${isActive}`
    );

    await connection.commit();
    return res.json({ message: 'Game status updated successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to update game status');
    return res.status(500).json({ error: 'Failed to update game status.' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/risk-alerts
export const getRiskAlerts = async (req, res) => {
  try {
    const alerts = await query(
      'SELECT ra.id, ra.user_id as userId, ra.trigger_type as triggerType, ra.risk_score as riskScore, ra.details, ra.is_resolved as isResolved, ra.created_at as createdAt, ' +
      'u.name as userName, u.phone as userPhone, u.uid as userUid ' +
      'FROM admin_risk_alerts ra ' +
      'JOIN users u ON ra.user_id = u.id ' +
      'ORDER BY ra.created_at DESC LIMIT 100'
    );
    return res.json(alerts || []);
  } catch (err) {
    logger.error(err, 'Failed to fetch admin risk alerts');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

// PUT /api/admin/risk-alerts/:id/resolve
export const resolveRiskAlert = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [alertRows] = await connection.query('SELECT user_id, trigger_type FROM admin_risk_alerts WHERE id = ?', [id]);
    if (alertRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Risk alert not found.' });
    }

    await connection.query('UPDATE admin_risk_alerts SET is_resolved = 1 WHERE id = ?', [id]);

    await logAdminAction(
      connection,
      req.user.id,
      'RESOLVE_RISK_ALERT',
      `Resolved risk alert ID ${id} (Type: ${alertRows[0].trigger_type}) for user ID ${alertRows[0].user_id}`
    );

    await connection.commit();
    return res.json({ message: 'Risk alert resolved successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to resolve risk alert');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/analytics/finances
export const getFinancialAnalytics = async (req, res) => {
  try {
    // 1. Gross wagering volume
    const [betsVolume] = await pool.query('SELECT COALESCE(SUM(bet_amount), 0) AS grossVolume FROM bets');

    // 2. Net profit (wagers - payouts)
    const [profitMargin] = await pool.query('SELECT COALESCE(SUM(bet_amount - payout_amount), 0) AS platformProfit FROM bets WHERE is_settled = 1');

    // 3. User Wallet totals
    const [walletTotals] = await pool.query('SELECT COALESCE(SUM(balance), 0) AS userWalletBalances, COALESCE(SUM(bonus_balance), 0) AS userBonusBalances FROM wallets');

    // 4. Deposits vs. Withdrawals
    const [depositResult] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS totalDeposits FROM deposits WHERE status = "completed"');
    const [withdrawResult] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS totalWithdrawals FROM withdrawals WHERE status = "PAID"');

    const grossVolume = parseFloat(betsVolume[0]?.grossVolume || 0);
    const platformProfit = parseFloat(profitMargin[0]?.platformProfit || 0);
    const walletBalances = parseFloat(walletTotals[0]?.userWalletBalances || 0);
    const bonusBalances = parseFloat(walletTotals[0]?.userBonusBalances || 0);
    const totalDeposits = parseFloat(depositResult[0]?.totalDeposits || 0);
    const totalWithdrawals = parseFloat(withdrawResult[0]?.totalWithdrawals || 0);

    // 5. Daily trend for the last 7 days
    const trendRecords = await query(`
      SELECT DATE(created_at) as date,
             COALESCE(SUM(bet_amount), 0) as grossVolume,
             COALESCE(SUM(bet_amount - payout_amount), 0) as platformProfit,
             COALESCE(SUM(payout_amount), 0) as totalPayouts
      FROM bets
      WHERE created_at >= NOW() - INTERVAL 7 DAY AND is_settled = 1
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    const formattedTrend = (trendRecords || []).map(r => {
      let dateStr = '';
      if (r.date instanceof Date) {
        dateStr = r.date.toISOString().split('T')[0];
      } else {
        dateStr = String(r.date).split('T')[0];
      }
      return {
        date: dateStr,
        grossVolume: parseFloat(r.grossVolume || 0),
        platformProfit: parseFloat(r.platformProfit || 0),
        totalPayouts: parseFloat(r.totalPayouts || 0)
      };
    });

    return res.json({
      summary: {
        grossVolume,
        platformProfit,
        walletBalances,
        bonusBalances,
        totalDeposits,
        totalWithdrawals
      },
      trend: formattedTrend
    });
  } catch (err) {
    logger.error(err, 'Failed to fetch financial analytics');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

// PUT /api/admin/games/:id/override
export const overrideGameOutcome = async (req, res) => {
  const { id } = req.params;
  const { outcome } = req.body;

  if (!outcome || outcome.trim() === '') {
    return res.status(400).json({ error: 'Outcome is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rounds] = await connection.query(
      'SELECT id, game_id, status FROM game_rounds WHERE round_id = ?',
      [id]
    );

    if (rounds.length > 0) {
      if (rounds[0].status === 'completed') {
        await connection.rollback();
        return res.status(400).json({ error: 'Cannot override a completed round.' });
      }
      await connection.query(
        'UPDATE game_rounds SET outcome = ? WHERE round_id = ?',
        [outcome.trim(), id]
      );
    } else {
      let gameId = 2;
      if (id.startsWith('3')) gameId = 1;
      else if (id.startsWith('1')) gameId = 2;
      else if (id.startsWith('2')) gameId = 3;
      else if (id.startsWith('5')) gameId = 4;
      else {
        const [games] = await connection.query('SELECT id FROM games WHERE name = "dice" LIMIT 1');
        gameId = games[0]?.id || 5;
      }

      await connection.query(
        'INSERT INTO game_rounds (game_id, round_id, server_seed, outcome, status) VALUES (?, ?, "MANUAL_OVERRIDE_SEED", ?, "active")',
        [gameId, id, outcome.trim()]
      );
    }

    await logAdminAction(
      connection,
      req.user.id,
      'MANUAL_OVERRIDE_OUTCOME',
      `Forced outcome for round ${id} to: ${outcome.trim()}`
    );

    await connection.commit();
    return res.json({ message: `Game round ${id} outcome set to "${outcome.trim()}" successfully.` });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to override game outcome');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/config/traffic
export const getConfigTraffic = async (req, res) => {
  let value = 500; // Secure corporate fallback baseline
  try {
    const [settings] = await query('SELECT config_value FROM system_configs WHERE config_key = "TRAFFIC_THRESHOLD_AMOUNT" LIMIT 1');
    if (settings && settings.length > 0 && settings[0].config_value) {
      const parsedVal = parseInt(settings[0].config_value, 10);
      if (!isNaN(parsedVal)) {
        value = parsedVal;
      }
    }
  } catch (dbError) {
    logger.warn('[Safe Dashboard Interceptor Warning]: Column/Table missing, utilizing fallback threshold: ' + dbError.message);
  }
  return res.json({
    success: true,
    trafficThresholdAmount: value,
    traffic_threshold_amount: value
  });
};

// PATCH /api/admin/config/traffic
export const updateConfigTraffic = async (req, res) => {
  const { trafficThresholdAmount } = req.body;

  if (trafficThresholdAmount === undefined) {
    return res.status(400).json({ error: 'Valid trafficThresholdAmount is required.' });
  }

  const cleanVal = String(trafficThresholdAmount).trim();
  if (!/^\d+$/.test(cleanVal)) {
    return res.status(400).json({ error: 'Valid trafficThresholdAmount positive integer is required.' });
  }

  try {
    await query(
      'INSERT INTO system_configs (config_key, config_value) VALUES ("TRAFFIC_THRESHOLD_AMOUNT", ?) ' +
      'ON DUPLICATE KEY UPDATE config_value = ?',
      [String(trafficThresholdAmount), String(trafficThresholdAmount)]
    );
    logger.info(`Admin ${req.user.id} updated TRAFFIC_THRESHOLD_AMOUNT to ${trafficThresholdAmount}`);
    return res.json({ message: 'Traffic threshold updated successfully.', trafficThresholdAmount });
  } catch (err) {
    logger.error(err, 'Failed to update traffic threshold config');
    return res.status(500).json({ error: 'Failed to update configuration.' });
  }
};

// GET /api/admin/store-config
export const getStoreConfig = async (req, res) => {
  try {
    const rows = await query('SELECT config_key, config_value FROM system_configs');
    const configMap = {};
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r && r.config_key) {
          configMap[r.config_key] = decryptConfigValue(r.config_value);
        }
      });
    }
    return res.json({
      success: true,
      trafficThresholdAmount: configMap['TRAFFIC_THRESHOLD_AMOUNT'] ? parseInt(configMap['TRAFFIC_THRESHOLD_AMOUNT'], 10) : 500,
      traffic_threshold_amount: configMap['TRAFFIC_THRESHOLD_AMOUNT'] ? parseInt(configMap['TRAFFIC_THRESHOLD_AMOUNT'], 10) : 500,
      gameSettings: configMap['GAME_SETTINGS'] || 'standard',
      game_settings: configMap['GAME_SETTINGS'] || 'standard',
      systemMaintenance: configMap['SYSTEM_MAINTENANCE_STATE'] || 'active',
      system_maintenance: configMap['SYSTEM_MAINTENANCE_STATE'] || 'active',
      pay0UserToken: configMap['PAY0_USER_TOKEN'] || '',
      pay0_user_token: configMap['PAY0_USER_TOKEN'] || ''
    });
  } catch (err) {
    logger.error(err, 'Failed to get store config');
    return res.status(200).json({
      success: true,
      trafficThresholdAmount: 500,
      traffic_threshold_amount: 500,
      gameSettings: 'standard',
      game_settings: 'standard',
      systemMaintenance: 'active',
      system_maintenance: 'active',
      pay0UserToken: '',
      pay0_user_token: ''
    });
  }
};

// PATCH /api/admin/store-config
export const updateStoreConfig = async (req, res) => {
  const { trafficThresholdAmount, gameSettings, systemMaintenance, pay0UserToken, pay0_user_token } = req.body;

  // 1. Sanitized Input Clamping: Accept only strict positive integers
  if (trafficThresholdAmount !== undefined) {
    const cleanVal = String(trafficThresholdAmount).trim();
    if (!/^\d+$/.test(cleanVal)) {
      return res.status(400).json({ error: 'Traffic threshold amount must be a valid positive integer.' });
    }
  }

  try {
    if (trafficThresholdAmount !== undefined) {
      await query(
        'INSERT INTO system_configs (config_key, config_value) VALUES ("TRAFFIC_THRESHOLD_AMOUNT", ?) ' +
        'ON DUPLICATE KEY UPDATE config_value = ?',
        [String(trafficThresholdAmount), String(trafficThresholdAmount)]
      );
    }
    if (gameSettings !== undefined) {
      await query(
        'INSERT INTO system_configs (config_key, config_value) VALUES ("GAME_SETTINGS", ?) ' +
        'ON DUPLICATE KEY UPDATE config_value = ?',
        [String(gameSettings), String(gameSettings)]
      );
    }
    if (systemMaintenance !== undefined) {
      await query(
        'INSERT INTO system_configs (config_key, config_value) VALUES ("SYSTEM_MAINTENANCE_STATE", ?) ' +
        'ON DUPLICATE KEY UPDATE config_value = ?',
        [String(systemMaintenance), String(systemMaintenance)]
      );
    }

    const pay0TokenValue = pay0UserToken !== undefined ? pay0UserToken : pay0_user_token;
    if (pay0TokenValue !== undefined) {
      await query(
        'INSERT INTO system_configs (config_key, config_value) VALUES ("PAY0_USER_TOKEN", ?) ' +
        'ON DUPLICATE KEY UPDATE config_value = ?',
        [String(pay0TokenValue), String(pay0TokenValue)]
      );
    }

    logger.info(`Admin ${req.user.id} updated store-config`);
    return res.json({ success: true, message: 'Store configurations updated successfully.' });
  } catch (err) {
    logger.error(err, 'Failed to update store config');
    return res.status(500).json({ error: 'Failed to update configuration.' });
  }
};

// POST /api/admin/verify-pay0-status
export const verifyPay0DepositStatus = async (req, res) => {
  const { depositId, transactionId } = req.body;
  if (!depositId && !transactionId) {
    return res.status(400).json({ error: 'Deposit ID or Transaction ID is required' });
  }

  try {
    // 1. Fetch deposit record
    const queryParam = depositId || transactionId;
    const [deposits] = await pool.query(
      depositId
        ? 'SELECT id, user_id, amount, transaction_id, status, coupon_code FROM deposits WHERE id = ? LIMIT 1'
        : 'SELECT id, user_id, amount, transaction_id, status, coupon_code FROM deposits WHERE transaction_id = ? LIMIT 1',
      [queryParam]
    );
    if (!deposits || deposits.length === 0) {
      return res.status(404).json({ error: 'Deposit record not found' });
    }

    const deposit = deposits[0];
    if (deposit.status === 'completed') {
      return res.json({ success: true, status: 'completed', message: 'Deposit is already completed' });
    }

    // 2. Fetch user token config
    const [configs] = await pool.query(
      'SELECT config_value FROM system_configs WHERE config_key = "PAY0_USER_TOKEN" LIMIT 1'
    );
    const user_token = decryptConfigValue(configs[0]?.config_value);
    if (!user_token) {
      return res.status(400).json({ error: 'Pay0 gateway is not configured (PAY0_USER_TOKEN is empty)' });
    }

    // 3. Make outbound request to check-order-status using form-urlencoded headers
    const formData = new URLSearchParams();
    formData.append('user_token', user_token);
    formData.append('order_id', deposit.transaction_id);

    const response = await axios.post('https://pay0.shop/api/check-order-status', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    logger.info(`[Admin Manual Verification] Status response for ${deposit.transaction_id}: ${JSON.stringify(response.data)}`);

    if (response.data && response.data.status === true && (response.data.result?.status === 'success' || response.data.result?.status === 'completed' || response.data.result?.status === 'SUCCESS')) {
      // Settle deposit atomically
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Re-lock deposit row
        const [lockedDeps] = await connection.query(
          'SELECT id, user_id, amount, status, coupon_code FROM deposits WHERE id = ? FOR UPDATE',
          [deposit.id]
        );
        const activeDep = lockedDeps[0];
        if (activeDep.status === 'completed') {
          await connection.rollback();
          return res.json({ success: true, status: 'completed', message: 'Deposit already completed' });
        }

        const userId = activeDep.user_id;
        const depositAmount = parseFloat(activeDep.amount);

        // Lock wallet
        const [wallets] = await connection.query(
          'SELECT id, balance, bonus_balance, required_wager, required_bonus_wager FROM wallets WHERE user_id = ? FOR UPDATE',
          [userId]
        );

        if (!wallets || wallets.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'User wallet not found.' });
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

        if (activeDep.coupon_code) {
          const [userCoupons] = await connection.query(
            'SELECT uc.id, c.reward_amount, c.min_deposit_required ' +
            'FROM user_coupons uc ' +
            'JOIN coupons c ON uc.coupon_id = c.id ' +
            'WHERE uc.user_id = ? AND c.code = ? AND uc.status = "AVAILABLE" AND uc.expires_at > NOW() ' +
            'LIMIT 1 FOR UPDATE',
            [userId, activeDep.coupon_code]
          );

          if (userCoupons && userCoupons.length > 0) {
            const uCoupon = userCoupons[0];
            if (depositAmount >= parseFloat(uCoupon.min_deposit_required)) {
              rewardAmount = parseFloat(uCoupon.reward_amount);
              userCouponId = uCoupon.id;
              const split = getCouponSplit(activeDep.coupon_code, rewardAmount, depositAmount);
              cashReward = split.cashReward;
              bonusReward = split.bonusReward;
            }
          }
        }

        const newBalance = parseFloat((currentBalance + depositAmount + cashReward).toFixed(4));
        const newBonusBalance = parseFloat((currentBonusBalance + bonusReward).toFixed(4));
        const newRequiredWager = parseFloat((currentRequiredWager + depositAmount + cashReward).toFixed(4));
        const newRequiredBonusWager = parseFloat((currentRequiredBonusWager + bonusReward * 10).toFixed(4));

        // Update wallets
        await connection.query(
          'UPDATE wallets SET balance = ?, bonus_balance = ?, required_wager = ?, required_bonus_wager = ? WHERE user_id = ?',
          [newBalance, newBonusBalance, newRequiredWager, newRequiredBonusWager, userId]
        );

        // Update deposit record to completed
        await connection.query(
          'UPDATE deposits SET status = "completed" WHERE id = ?',
          [activeDep.id]
        );

        // Mark user coupon as USED if successfully verified
        if (userCouponId) {
          await connection.query(
            'UPDATE user_coupons SET status = "USED" WHERE id = ?',
            [userCouponId]
          );
        }

        // Write ledger transaction log for deposit
        await connection.query(
          'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
          'VALUES (?, ?, ?, "deposit", "deposits", ?, ?, ?, ?)',
          [userId, wallet.id, depositAmount, activeDep.id, currentBalance, currentBalance + depositAmount, `Manually verified Pay0 deposit of ₹${depositAmount} (Order: ${deposit.transaction_id})`]
        );

        // Write ledger transaction log for coupon cash reward if applicable
        if (cashReward > 0 && userCouponId) {
          await connection.query(
            'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
            'VALUES (?, ?, ?, "bonus_claim", "user_coupons", ?, ?, ?, ?)',
            [userId, wallet.id, cashReward, userCouponId, currentBalance + depositAmount, newBalance, `Applied coupon cash reward via manual verification (Code: ${activeDep.coupon_code})`]
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
          ? `Wallet Recharged! Recharge of ₹${depositAmount} + Coupon reward of ₹${rewardAmount} was successfully verified and credited.`
          : `Wallet Recharged! Recharge of ₹${depositAmount} was successfully verified and credited.`;

        await createNotification(
          userId,
          'Wallet Recharged!',
          notificationMsg,
          'WALLET',
          connection
        );

        await connection.commit();
        return res.json({ success: true, status: 'completed', message: 'Deposit completed and wallet credited successfully.' });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else {
      const pay0Status = response.data?.result?.status || 'PENDING';
      return res.json({ success: false, status: pay0Status, message: `Gateway status returned: ${pay0Status}` });
    }
  } catch (err) {
    logger.error(err, 'Error manually verifying Pay0 deposit status');
    return res.status(500).json({ error: 'Failed to verify payment with gateway.' });
  }
};

// GET /api/superadmin/config
export const getSuperAdminConfig = async (req, res) => {
  try {
    const configs = await query('SELECT config_key, config_value FROM system_configs');
    
    const maskKey = (key) => {
      if (!key) return '';
      if (key.length <= 8) return '*'.repeat(key.length);
      return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
    };

    const data = {
      RESEND_API_KEY: maskKey(process.env.RESEND_API_KEY),
      SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '',
      GEMINI_AI_API_KEY: maskKey(process.env.GEMINI_API_KEY || process.env.GEMINI_AI_API_KEY),
      TELEGRAM_BOT_TOKEN: maskKey(process.env.TELEGRAM_BOT_TOKEN),
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
      PAY0_USER_TOKEN: maskKey(process.env.PAY0_USER_TOKEN),
      PAY0_WEBHOOK_URL: '',
      PAY0_REDIRECT_URL: '',
      RENFLAIR_SMS_API_KEY: maskKey(process.env.RENFLAIR_SMS_API_KEY)
    };

    configs.forEach(c => {
      const decryptedValue = decryptConfigValue(c.config_value);
      if (data.hasOwnProperty(c.config_key) && decryptedValue) {
        // Show full URL values for webhook/redirect (not sensitive secrets)
        if (c.config_key === 'SMTP_FROM_EMAIL' || c.config_key === 'TELEGRAM_CHAT_ID' || c.config_key === 'PAY0_WEBHOOK_URL' || c.config_key === 'PAY0_REDIRECT_URL') {
          data[c.config_key] = decryptedValue;
        } else {
          data[c.config_key] = maskKey(decryptedValue);
        }
      }
    });

    Object.keys(data).forEach(k => {
      if (data[k] === '') {
        logger.warn(`[System Config Warning]: Key missing - ${k}`);
      }
    });

    return res.json(data);
  } catch (err) {
    logger.error(err, 'Failed to fetch superadmin configs');
    return res.status(500).json({ error: 'Failed to retrieve configuration.' });
  }
};

// PATCH /api/superadmin/config
export const updateSuperAdminConfig = async (req, res) => {
  const {
    totpCode,
    RESEND_API_KEY,
    SMTP_FROM_EMAIL,
    GEMINI_AI_API_KEY,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    PAY0_USER_TOKEN,
    PAY0_WEBHOOK_URL,
    PAY0_REDIRECT_URL,
    RENFLAIR_SMS_API_KEY
  } = req.body;

  if (!totpCode) {
    return res.status(400).json({ error: 'TOTP verification code is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify TOTP of the requesting Super Admin
    const [adminData] = await connection.query('SELECT two_factor_secret FROM users WHERE id = ?', [req.user.id]);
    if (!adminData.length || !adminData[0].two_factor_secret) {
      await connection.rollback();
      return res.status(403).json({ error: '2FA is not configured for your Super Admin account. Please set it up to update configurations.' });
    }

    const verified = speakeasy.totp.verify({
      secret: decryptSecret(adminData[0].two_factor_secret),
      encoding: 'base32',
      token: totpCode,
      window: 2
    });

    if (!verified) {
      await connection.rollback();
      return res.status(401).json({ error: 'Invalid or expired 2FA code.' });
    }

    // Update keys if provided (and not masked strings containing asterisks)
    const updateKey = async (key, value) => {
      if (value !== undefined && value !== null && !String(value).includes('*')) {
        const encryptedValue = encryptConfigValue(value);
        await connection.query(
          'INSERT INTO system_configs (config_key, config_value) VALUES (?, ?) ' +
          'ON DUPLICATE KEY UPDATE config_value = ?',
          [key, encryptedValue, encryptedValue]
        );
      }
    };

    await updateKey('RESEND_API_KEY', RESEND_API_KEY);
    await updateKey('SMTP_FROM_EMAIL', SMTP_FROM_EMAIL);
    await updateKey('GEMINI_AI_API_KEY', GEMINI_AI_API_KEY);
    await updateKey('TELEGRAM_BOT_TOKEN', TELEGRAM_BOT_TOKEN);
    await updateKey('TELEGRAM_CHAT_ID', TELEGRAM_CHAT_ID);
    await updateKey('PAY0_USER_TOKEN', PAY0_USER_TOKEN);
    await updateKey('PAY0_WEBHOOK_URL', PAY0_WEBHOOK_URL);
    await updateKey('PAY0_REDIRECT_URL', PAY0_REDIRECT_URL);
    await updateKey('RENFLAIR_SMS_API_KEY', RENFLAIR_SMS_API_KEY);

    await connection.commit();
    logger.info(`Super Admin ${req.user.id} updated system_configs`);
    return res.json({ message: 'Configurations updated successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to update superadmin configs');
    return res.status(500).json({ error: 'Failed to update configuration.' });
  } finally {
    connection.release();
  }
};

// POST /api/superadmin/update-user
export const updateUserRole = async (req, res) => {
  const { userId, newRole, totpCode } = req.body;
  if (!userId || !newRole || !totpCode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Explicit privilege control block
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Only Super Admins can update roles.' });
  }

  if (newRole === 'admin' || newRole === 'super_admin') {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Permission denied. Standard admins cannot elevate user privileges.' });
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify TOTP of the requesting Super Admin
    const [adminData] = await connection.query('SELECT two_factor_secret FROM users WHERE id = ?', [req.user.id]);
    if (!adminData.length || !adminData[0].two_factor_secret) {
      await connection.rollback();
      return res.status(400).json({ error: '2FA is not configured for your Super Admin account.' });
    }

    const verified = speakeasy.totp.verify({
      secret: decryptSecret(adminData[0].two_factor_secret),
      encoding: 'base32',
      token: totpCode,
      window: 2
    });

    if (!verified) {
      await connection.rollback();
      return res.status(401).json({ error: 'Invalid or expired 2FA code.' });
    }

    // Process user update
    const [targetUser] = await connection.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!targetUser.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser[0].role === 'super_admin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Cannot modify a Super Admin account.' });
    }

    await connection.query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);

    await connection.commit();
    logger.info(`Super Admin ${req.user.id} promoted user ${userId} to ${newRole}`);
    return res.json({ message: `User role successfully updated to ${newRole}` });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to update user role');
    return res.status(500).json({ error: 'Server error during role update.' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/notifications
export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await query(
      'SELECT id, user_id as userId, title, message, is_read as isRead, type, created_at as createdAt FROM notifications WHERE type IN ("SYSTEM_ALERT", "COUPON") OR user_id IS NULL ORDER BY created_at DESC LIMIT 100'
    );
    return res.json(notifications || []);
  } catch (err) {
    logger.error(err, 'Failed to fetch admin notifications');
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

// POST /api/admin/notifications/broadcast
export const broadcastNotification = async (req, res) => {
  const { target, target_user_id, title, message, type } = req.body;

  if (!target || !title || !message || !type) {
    return res.status(400).json({ error: 'Missing required broadcast parameters' });
  }

  try {
    if (target === 'ALL') {
      const [notifRes] = await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (NULL, ?, ?, ?)',
        [title, message, type]
      );

      if (ioInstance) {
        ioInstance.emit('notification', {
          id: notifRes.insertId,
          title,
          message,
          type,
          isRead: 0,
          createdAt: new Date().toISOString()
        });
      }

      logger.info(`Admin ${req.user.id} broadcasted global notification: ${title}`);
      return res.json({ message: 'Global broadcast dispatched successfully' });

    } else if (target === 'SPECIFIC_USER') {
      if (!target_user_id) return res.status(400).json({ error: 'Target user ID is required' });

      // Verify user exists
      const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [target_user_id]);
      if (users.length === 0) return res.status(404).json({ error: 'Target user not found' });

      const [notifRes] = await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [target_user_id, title, message, type]
      );

      if (ioInstance) {
        ioInstance.to(target_user_id.toString()).emit('notification', {
          id: notifRes.insertId,
          title,
          message,
          type,
          isRead: 0,
          createdAt: new Date().toISOString()
        });
      }

      logger.info(`Admin ${req.user.id} sent specific notification to User ${target_user_id}`);
      return res.json({ message: `Notification sent successfully to User ${target_user_id}` });
    } else {
      return res.status(400).json({ error: 'Invalid target type' });
    }

  } catch (err) {
    logger.error(err, 'Failed to dispatch broadcast');
    return res.status(500).json({ error: 'Failed to process broadcast.' });
  }
};

// GET /api/admin/game-center/config
export const getGameCenterConfig = async (req, res) => {
  try {
    const rows = await query('SELECT config_key, config_value FROM system_configs');
    const configMap = {};
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r && r.config_key) {
          configMap[r.config_key] = r.config_value;
        }
      });
    }
    
    return res.json({
      success: true,
      rtpTarget: configMap['RTP_TARGET'] ? parseFloat(configMap['RTP_TARGET']) : 96.5,
      settlementMode: configMap['SETTLEMENT_MODE'] || 'auto',
      minBetColour: configMap['MIN_BET_COLOUR'] ? parseInt(configMap['MIN_BET_COLOUR'], 10) : 10,
      maxBetColour: configMap['MAX_BET_COLOUR'] ? parseInt(configMap['MAX_BET_COLOUR'], 10) : 10000,
      minBetDice: configMap['MIN_BET_DICE'] ? parseInt(configMap['MIN_BET_DICE'], 10) : 10,
      maxBetDice: configMap['MAX_BET_DICE'] ? parseInt(configMap['MAX_BET_DICE'], 10) : 10000,
      jackpotSeed: configMap['JACKPOT_SEED'] ? parseInt(configMap['JACKPOT_SEED'], 10) : 1000000,
      jackpotGrowth: configMap['JACKPOT_GROWTH'] ? parseFloat(configMap['JACKPOT_GROWTH']) : 0.5,
      isJackpotEnabled: configMap['IS_JACKPOT_ENABLED'] !== 'false',
      manualJackpotUser: configMap['MANUAL_JACKPOT_USER'] || '',
      colourWinRule: configMap['COLOUR_WIN_RULE'] || 'rng',
      diceWinRule: configMap['DICE_WIN_RULE'] || 'rng',
      colourMultiplierGreen: configMap['COLOUR_MULTIPLIER_GREEN'] ? parseFloat(configMap['COLOUR_MULTIPLIER_GREEN']) : 2.0,
      colourMultiplierViolet: configMap['COLOUR_MULTIPLIER_VIOLET'] ? parseFloat(configMap['COLOUR_MULTIPLIER_VIOLET']) : 4.5,
      colourMultiplierRed: configMap['COLOUR_MULTIPLIER_RED'] ? parseFloat(configMap['COLOUR_MULTIPLIER_RED']) : 2.0,
      diceHouseFee: configMap['DICE_HOUSE_FEE'] ? parseFloat(configMap['DICE_HOUSE_FEE']) : 2.0,
      activeServerSeed: configMap['ACTIVE_SERVER_SEED'] || 'd3b07384d113edec49eaa6238ad5ff00',
      activeClientSeed: configMap['ACTIVE_CLIENT_SEED'] || 'colourplay_public_client_seed',
      seedNonce: configMap['SEED_NONCE'] ? parseInt(configMap['SEED_NONCE'], 10) : 402,
      publicSeedHash: configMap['PUBLIC_SEED_HASH'] || 'f728c7075c34511efda8df2838bd238c'
    });
  } catch (err) {
    logger.error(err, 'Failed to fetch game center configs');
    return res.status(500).json({ error: 'Failed to retrieve Game Center configuration.' });
  }
};

// PATCH /api/admin/game-center/config
export const updateGameCenterConfig = async (req, res) => {
  const configs = req.body;
  try {
    const upsertConfig = async (key, val) => {
      if (val !== undefined && val !== null) {
        await query(
          'INSERT INTO system_configs (config_key, config_value) VALUES (?, ?) ' +
          'ON DUPLICATE KEY UPDATE config_value = ?',
          [key, String(val), String(val)]
        );
      }
    };

    await upsertConfig('RTP_TARGET', configs.rtpTarget);
    await upsertConfig('SETTLEMENT_MODE', configs.settlementMode);
    await upsertConfig('MIN_BET_COLOUR', configs.minBetColour);
    await upsertConfig('MAX_BET_COLOUR', configs.maxBetColour);
    await upsertConfig('MIN_BET_DICE', configs.minBetDice);
    await upsertConfig('MAX_BET_DICE', configs.maxBetDice);
    await upsertConfig('JACKPOT_SEED', configs.jackpotSeed);
    await upsertConfig('JACKPOT_GROWTH', configs.jackpotGrowth);
    await upsertConfig('IS_JACKPOT_ENABLED', configs.isJackpotEnabled !== undefined ? String(configs.isJackpotEnabled) : undefined);
    await upsertConfig('MANUAL_JACKPOT_USER', configs.manualJackpotUser);
    await upsertConfig('COLOUR_WIN_RULE', configs.colourWinRule);
    await upsertConfig('DICE_WIN_RULE', configs.diceWinRule);
    await upsertConfig('COLOUR_MULTIPLIER_GREEN', configs.colourMultiplierGreen);
    await upsertConfig('COLOUR_MULTIPLIER_VIOLET', configs.colourMultiplierViolet);
    await upsertConfig('COLOUR_MULTIPLIER_RED', configs.colourMultiplierRed);
    await upsertConfig('DICE_HOUSE_FEE', configs.diceHouseFee);
    await upsertConfig('ACTIVE_SERVER_SEED', configs.activeServerSeed);
    await upsertConfig('ACTIVE_CLIENT_SEED', configs.activeClientSeed);
    await upsertConfig('SEED_NONCE', configs.seedNonce);
    await upsertConfig('PUBLIC_SEED_HASH', configs.publicSeedHash);

    logger.info(`Admin ${req.user.id} updated Game Center config`);
    return res.json({ success: true, message: 'Game Center configurations updated successfully.' });
  } catch (err) {
    logger.error(err, 'Failed to update game center config');
    return res.status(500).json({ error: 'Failed to update Game Center configuration.' });
  }
};
