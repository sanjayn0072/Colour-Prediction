import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';
import { verifyFirebaseToken } from '../utils/firebaseAdmin.js';
import { query, pool } from '../config/db.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });
};

export const sendOtp = async (req, res) => {
  const { name, phone, email, password } = req.body;

  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const normalizedPhone = phone.replace(/[\s-]/g, '');

    // Check availability in MySQL
    const users = await query(
      'SELECT id FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [normalizedPhone, email]
    );

    if (users && users.length > 0) {
      return res.status(400).json({ error: 'Phone number or email already registered' });
    }

    return res.status(200).json({ message: 'Validation successful' });
  } catch (error) {
    logger.error(error, 'Error in sendOtp');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

const generateUniqueUid = async (connection) => {
  let attempts = 0;
  while (attempts < 10) {
    const uid = Math.floor(100000 + Math.random() * 900000).toString();
    const [existing] = await connection.query('SELECT id FROM users WHERE uid = ? LIMIT 1', [uid]);
    if (existing.length === 0) {
      return uid;
    }
    attempts++;
  }
  throw new Error('Failed to generate a unique 6-digit UID');
};

export const verifyOtpRegister = async (req, res) => {
  const { name, phone, email, password, idToken } = req.body;

  if (!name || !phone || !email || !password || !idToken) {
    return res.status(400).json({ error: 'All fields, including Firebase ID Token, are required' });
  }

  const connection = await pool.getConnection();
  try {
    // 1. Verify Firebase ID Token
    const claims = await verifyFirebaseToken(idToken);
    const verifiedPhone = claims.phone_number;

    if (!verifiedPhone) {
      return res.status(400).json({ error: 'Firebase ID Token does not contain a verified phone number' });
    }

    const normalizedReqPhone = phone.replace(/[\s-]/g, '');
    const normalizedVerifiedPhone = verifiedPhone.replace(/[\s-]/g, '');

    if (normalizedReqPhone !== normalizedVerifiedPhone) {
      return res.status(400).json({ error: 'Registration phone number does not match verified Firebase phone number' });
    }

    // 2. Double check user doesn't exist
    const users = await query(
      'SELECT id FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [normalizedReqPhone, email]
    );
    if (users && users.length > 0) {
      return res.status(400).json({ error: 'Phone number or email already registered' });
    }

    // 3. Create actual user inside transaction
    await connection.beginTransaction();

    const uid = await generateUniqueUid(connection);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [userResult] = await connection.query(
      'INSERT INTO users (uid, name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?, "user")',
      [uid, name, normalizedReqPhone, email, hashedPassword]
    );
    const newUserId = userResult.insertId;

    // Create wallet row
    await connection.query(
      'INSERT INTO wallets (user_id, balance, bonus_balance) VALUES (?, 0.00, 0.00)',
      [newUserId]
    );

    // Create statistics row
    await connection.query(
      'INSERT INTO user_stats (user_id) VALUES (?)',
      [newUserId]
    );

    await connection.commit();

    const token = generateToken(newUserId);
    return res.status(201).json({
      token,
      user: {
        id: String(newUserId),
        _id: String(newUserId),
        uid,
        name,
        phone: normalizedReqPhone,
        email,
        walletBalance: 0,
        bonusBalance: 0,
        role: 'user'
      }
    });
  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Error in verifyOtpRegister');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    connection.release();
  }
};

export const firebaseLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'Firebase ID Token is required' });
  }

  try {
    // 1. Verify ID Token
    const claims = await verifyFirebaseToken(idToken);
    const verifiedPhone = claims.phone_number;

    if (!verifiedPhone) {
      return res.status(400).json({ error: 'Firebase ID Token does not contain a verified phone number' });
    }

    const normalizedPhone = verifiedPhone.replace(/[\s-]/g, '');

    // 2. Find user in database with wallet balances
    const users = await query(
      'SELECT u.id, u.name, u.phone, u.email, u.role, u.status, w.balance as wallet_balance, w.bonus_balance, w.locked_balance, w.required_wager ' +
      'FROM users u ' +
      'JOIN wallets w ON u.id = w.user_id ' +
      'WHERE u.phone = ? LIMIT 1',
      [normalizedPhone]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'No account associated with this phone number. Please register first.' });
    }

    const user = users[0];

    // Fetch claimed VIP rewards
    const vipClaims = await query(
      'SELECT v.vip_level, v.reward_type FROM bonuses b ' +
      'JOIN vip_bonus_details v ON b.id = v.bonus_id ' +
      'WHERE b.user_id = ? AND b.type = "vip"',
      [user.id]
    );
    const claimedRewards = vipClaims.map(c => `${c.vip_level}-${c.reward_type}`);

    const token = generateToken(user.id);
    return res.json({
      token,
      user: {
        id: String(user.id),
        _id: String(user.id),
        name: user.name,
        phone: user.phone,
        email: user.email,
        walletBalance: parseFloat(user.wallet_balance || 0),
        availableBalance: parseFloat(user.wallet_balance || 0),
        lockedBalance: parseFloat(user.locked_balance || 0),
        bonusBalance: parseFloat(user.bonus_balance || 0),
        requiredWager: parseFloat(user.required_wager || 0),
        claimedVipRewards: claimedRewards,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(401).json({ error: `Authentication failed: ${error.message}` });
  }
};

export const register = async (req, res) => {
  return res.status(400).json({ error: 'Registration now requires Firebase verification. Please update your client.' });
};

export const login = async (req, res) => {
  const { phoneOrEmail, password } = req.body;

  if (!phoneOrEmail || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Query users with wallet balances
    const users = await query(
      'SELECT u.id, u.name, u.phone, u.email, u.password_hash, u.role, u.status, w.balance as wallet_balance, w.bonus_balance, w.locked_balance, w.required_wager ' +
      'FROM users u ' +
      'JOIN wallets w ON u.id = w.user_id ' +
      'WHERE u.phone = ? OR u.email = ? LIMIT 1',
      [phoneOrEmail, phoneOrEmail]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Password verification using bcrypt
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch claimed VIP rewards
    const vipClaims = await query(
      'SELECT v.vip_level, v.reward_type FROM bonuses b ' +
      'JOIN vip_bonus_details v ON b.id = v.bonus_id ' +
      'WHERE b.user_id = ? AND b.type = "vip"',
      [user.id]
    );
    const claimedRewards = vipClaims.map(c => `${c.vip_level}-${c.reward_type}`);

    const token = generateToken(user.id);
    return res.json({
      token,
      user: {
        id: String(user.id),
        _id: String(user.id),
        name: user.name,
        phone: user.phone,
        email: user.email,
        walletBalance: parseFloat(user.wallet_balance || 0),
        availableBalance: parseFloat(user.wallet_balance || 0),
        lockedBalance: parseFloat(user.locked_balance || 0),
        bonusBalance: parseFloat(user.bonus_balance || 0),
        requiredWager: parseFloat(user.required_wager || 0),
        claimedVipRewards: claimedRewards,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(error, 'Error in login');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

export const getProfile = async (req, res) => {
  if (!req.user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    // Fetch wallet balance
    const wallets = await query(
      'SELECT balance as wallet_balance, bonus_balance, locked_balance, required_wager FROM wallets WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const wallet = wallets[0] || { wallet_balance: 0, bonus_balance: 0, locked_balance: 0, required_wager: 0 };

    // Fetch claimed VIP rewards
    const vipClaims = await query(
      'SELECT v.vip_level, v.reward_type FROM bonuses b ' +
      'JOIN vip_bonus_details v ON b.id = v.bonus_id ' +
      'WHERE b.user_id = ? AND b.type = "vip"',
      [req.user.id]
    );
    const claimedRewards = vipClaims.map(c => `${c.vip_level}-${c.reward_type}`);

    // Fetch payment methods
    const payments = await query(
      'SELECT type, account_name, account_number, ifsc_code, upi_id, is_primary FROM payment_methods WHERE user_id = ?',
      [req.user.id]
    );

    const bank = payments.find(p => p.type === 'bank') || null;
    const upi = payments.find(p => p.type === 'upi') || null;

    // Fetch user statistics
    const statsResult = await query(
      'SELECT total_deposits, spins_count, orders_count FROM user_stats WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const stats = statsResult[0] || { total_deposits: 0, spins_count: 0, orders_count: 0 };

    return res.json({
      user: {
        id: String(req.user.id),
        _id: String(req.user.id),
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email,
        walletBalance: parseFloat(wallet.wallet_balance || 0),
        availableBalance: parseFloat(wallet.wallet_balance || 0),
        lockedBalance: parseFloat(wallet.locked_balance || 0),
        bonusBalance: parseFloat(wallet.bonus_balance || 0),
        requiredWager: parseFloat(wallet.required_wager || 0),
        claimedVipRewards: claimedRewards,
        role: req.user.role,
        bankDetails: bank ? {
          holderName: bank.account_name,
          accountNumber: bank.account_number,
          ifscCode: bank.ifsc_code,
          bankName: 'Linked Account'
        } : null,
        upiDetails: upi ? {
          upiId: upi.upi_id
        } : null,
        totalDeposits: parseFloat(stats.total_deposits || 0),
        spinsCount: parseInt(stats.spins_count || 0, 10),
        ordersCount: parseInt(stats.orders_count || 0, 10)
      }
    });
  } catch (err) {
    logger.error(err, 'Error in getProfile');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};
