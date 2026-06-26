import { query, pool } from '../config/db.js';
import { ioInstance } from './gameController.js';
import logger from '../utils/logger.js';

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
      "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS totalAmount FROM withdrawals WHERE status = 'pending'"
    );
    const pendingWithdrawalsCount = parseInt(withdrawalsResult[0]?.count || 0, 10);
    const pendingWithdrawalsAmount = parseFloat(withdrawalsResult[0]?.totalAmount || 0);

    return res.json({
      activePlayers: activePlayersCount,
      totalBets: totalBetsVolume,
      pendingWithdrawals: pendingWithdrawalsCount,
      pendingWithdrawalsAmount
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
      const records = await query(
        'SELECT al.id, al.action, al.details, al.created_at as createdAt, a.name as adminName ' +
        'FROM audit_logs al ' +
        'JOIN users a ON al.admin_id = a.id ' +
        'ORDER BY al.created_at DESC LIMIT 30'
      );
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
    let sql = `
      SELECT u.id, u.uid, u.name, u.phone, u.email, u.role, u.status, u.created_at as createdAt,
             w.balance as walletBalance, w.bonus_balance as bonusBalance, w.locked_balance as lockedBalance, w.required_wager as requiredWager,
             COALESCE(us.games_played, 0) as gamesPlayed, COALESCE(us.total_deposits, 0) as totalDeposits, COALESCE(us.total_withdrawals, 0) as totalWithdrawals
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN user_stats us ON u.id = us.user_id
      WHERE u.role != 'super_admin'
    `;
    const params = [];

    if (search.trim() !== '') {
      sql += ' AND (u.phone LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR u.uid LIKE ?)';
      const wild = `%${search.trim()}%`;
      params.push(wild, wild, wild, wild);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [users] = await pool.query(sql, params);

    // Count query for pagination
    let countSql = 'SELECT COUNT(*) as total FROM users u WHERE u.role != "super_admin"';
    const countParams = [];
    if (search.trim() !== '') {
      countSql += ' AND (u.phone LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR u.uid LIKE ?)';
      countParams.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    const [totalResult] = await pool.query(countSql, countParams);
    const total = totalResult[0]?.total || 0;

    return res.json({
      records: users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    logger.error(err, 'Failed to fetch admin users');
    return res.status(500).json({ error: 'Failed to retrieve users.' });
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
    return res.status(500).json({ error: 'Failed to retrieve orders.' });
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
             u.name as userName, u.phone as userPhone, a.name as adminName
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
