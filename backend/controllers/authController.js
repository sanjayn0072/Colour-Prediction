import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { query, pool } from '../config/db.js';
import { sendSMSVerification } from '../utils/smsService.js';
import { createNotification } from '../utils/notifier.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });
};

const getCleanPhone = (phone) => {
  if (typeof phone !== 'string') return '';
  const sanitized = phone.replace(/[\s-]/g, '').replace(/\+/g, '');
  if (sanitized.length === 12 && sanitized.startsWith('91')) {
    return sanitized.substring(2);
  }
  if (sanitized.length === 11 && sanitized.startsWith('0')) {
    return sanitized.substring(1);
  }
  return sanitized;
};

/**
 * Sends a registration OTP via SMS using our Renflair Gateway integration.
 */
export const sendOtp = async (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Please fill in all the required fields before proceeding.' });
  }

  const email = req.body.email ? String(req.body.email).trim() : `${getCleanPhone(phone)}@temp-user.com`;

  try {
    const cleanPhone = getCleanPhone(phone);

    // Backend Sanitization Gate: Reject invalid phone numbers
    if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }

    // Check availability in MySQL
    const users = await query(
      'SELECT id FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [cleanPhone, email]
    );

    if (users && users.length > 0) {
      return res.status(400).json({ error: 'This phone number is already registered. Please sign in to your account.' });
    }

    // Generate numeric 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // CRITICAL: Ensure the database write finishes cleanly BEFORE SMS dispatch fires
    await query(
      'INSERT INTO otp_tokens (email, otp_hash, type, expires_at) VALUES (?, ?, "REGISTER", DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [cleanPhone, otpHash]
    );

    // Call dynamic smsService
    const smsResult = await sendSMSVerification(cleanPhone, otp);

    // If SMS gateway fails, return 502 — fail loudly in production
    if (!smsResult.success) {
      logger.error(`[SMS] sendOtp failed for ${cleanPhone}: ${smsResult.error}`);
      return res.status(502).json({ error: 'We were unable to deliver the verification code. Please check your number and try again shortly.' });
    }

    return res.status(200).json({ message: 'Verification code sent via SMS.' });
  } catch (error) {
    logger.error(error, 'Error in sendOtp');
    return res.status(500).json({ error: 'We encountered an unexpected issue on our server. Please try again in a few moments.' });
  }
};

const generateUniqueUid = async (connection) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  while (attempts < 20) {
    let uid = '';
    for (let i = 0; i < 8; i++) {
      uid += chars[crypto.randomInt(0, chars.length)];
    }
    const [existing] = await connection.query('SELECT id FROM users WHERE uid = ? LIMIT 1', [uid]);
    if (existing.length === 0) {
      return uid;
    }
    attempts++;
  }
  throw new Error('Failed to generate a unique 8-character UID');
};

/**
 * Verifies the OTP and registers the user inside an atomic transaction.
 */
export const verifyOtpRegister = async (req, res) => {
  const { name, phone, password, otp, inviteCode } = req.body;

  if (!name || !phone || !password || !otp) {
    return res.status(400).json({ error: 'Please fill in all fields and enter your verification code.' });
  }

  const email = req.body.email ? String(req.body.email).trim() : `${getCleanPhone(phone)}@temp-user.com`;

  const connection = await pool.getConnection();
  try {
    const cleanPhone = getCleanPhone(phone);
    const otpStr = String(otp).trim();

    // Backend Sanitization Gate: Reject invalid inputs
    if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      connection.release();
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }
    if (otpStr.length !== 6 || !/^\d+$/.test(otpStr)) {
      connection.release();
      return res.status(400).json({ error: 'Please enter the complete 6-digit verification code.' });
    }

    // Compare user OTP hash against the record matching this phone number
    const otpHash = crypto.createHash('sha256').update(otpStr).digest('hex');
    const tokens = await connection.query(
      'SELECT id FROM otp_tokens WHERE email = ? AND otp_hash = ? AND type = "REGISTER" AND expires_at > NOW() LIMIT 1',
      [cleanPhone, otpHash]
    );
    
    if (!tokens[0] || tokens[0].length === 0) {
      connection.release();
      return res.status(400).json({ error: 'The verification code you entered is invalid or has expired. Please request a new code.' });
    }

    // Double check user doesn't exist
    const users = await connection.query(
      'SELECT id FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [cleanPhone, email]
    );
    if (users[0] && users[0].length > 0) {
      connection.release();
      return res.status(400).json({ error: 'This phone number is already registered. Please sign in to your account.' });
    }

    // Lookup referrer if inviteCode was provided
    let referrerId = null;
    if (inviteCode && inviteCode.trim() !== '') {
      const cleanInvite = String(inviteCode).trim().replace(/[^a-zA-Z0-9]/g, '');
      const referrers = await connection.query(
        'SELECT id FROM users WHERE uid = ? LIMIT 1',
        [cleanInvite]
      );
      if (referrers[0] && referrers[0].length > 0) {
        referrerId = referrers[0][0].id;
      }
    }

    // Create user profile inside MySQL Transaction
    await connection.beginTransaction();

    await connection.query('DELETE FROM otp_tokens WHERE id = ?', [tokens[0][0].id]);

    const uid = await generateUniqueUid(connection);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [userResult] = await connection.query(
      'INSERT INTO users (uid, name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?, "user")',
      [uid, name, cleanPhone, email, hashedPassword]
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

    // Insert referral tracking link if referrerId was found
    if (referrerId) {
      await connection.query(
        'INSERT INTO referrals (referrer_id, referred_id, status) VALUES (?, ?, "registered")',
        [referrerId, newUserId]
      );
    }

    // Allocate welcome coupon code (WELCOME150)
    const [welcomeCoupon] = await connection.query(
      'SELECT id FROM coupons WHERE code = "WELCOME150" LIMIT 1'
    );
    if (welcomeCoupon && welcomeCoupon.length > 0) {
      await connection.query(
        'INSERT INTO user_coupons (user_id, coupon_id, status, expires_at) VALUES (?, ?, "AVAILABLE", DATE_ADD(NOW(), INTERVAL 7 DAY))',
        [newUserId, welcomeCoupon[0].id]
      );
      
      // Send coupon allocation notification
      await createNotification(
        newUserId,
        'Welcome Reward Coupon!',
        'We have allocated a welcome reward coupon WELCOME150 to your account. Apply it on your next deposit of ₹500+ to claim ₹150 cash!',
        'COUPON',
        connection
      );
    }

    await connection.commit();

    const token = generateToken(newUserId);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    return res.status(201).json({
      token,
      user: {
        id: String(newUserId),
        _id: String(newUserId),
        uid,
        name,
        phone: cleanPhone,
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

/**
 * Stub login endpoint to deprecate Firebase authentication.
 */
export const firebaseLogin = async (req, res) => {
  return res.status(400).json({ error: 'Firebase Auth is deprecated. Please register or login using password credentials.' });
};

export const register = async (req, res) => {
  return res.status(400).json({ error: 'Registration now requires SMS verification. Please update your client.' });
};

export const login = async (req, res) => {
  const { phoneOrEmail, password } = req.body;

  if (!phoneOrEmail || !password) {
    return res.status(400).json({ error: 'Please enter your credentials to sign in.' });
  }

  try {
    const cleanLookup = getCleanPhone(phoneOrEmail);

    // Query users with wallet balances
    const users = await query(
      'SELECT u.id, u.name, u.phone, u.email, u.password_hash, u.role, u.status, w.balance as wallet_balance, w.bonus_balance, w.locked_balance, w.required_wager, w.required_bonus_wager ' +
      'FROM users u ' +
      'JOIN wallets w ON u.id = w.user_id ' +
      'WHERE u.phone = ? OR u.email = ? LIMIT 1',
      [cleanLookup, phoneOrEmail]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ error: "The phone number or password you entered doesn't match our records. Please double-check and try again." });
    }

    const user = users[0];

    // Password verification using bcrypt
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "The phone number or password you entered doesn't match our records. Please double-check and try again." });
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
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
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
        requiredBonusWager: parseFloat(user.required_bonus_wager || 0),
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
      'SELECT balance as wallet_balance, bonus_balance, locked_balance, required_wager, required_bonus_wager FROM wallets WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const wallet = wallets[0] || { wallet_balance: 0, bonus_balance: 0, locked_balance: 0, required_wager: 0, required_bonus_wager: 0 };

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
      'SELECT total_deposits, spins_count, orders_count, games_played, total_winnings_won FROM user_stats WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const stats = statsResult[0] || { total_deposits: 0, spins_count: 0, orders_count: 0, games_played: 0, total_winnings_won: 0 };

    // Fetch today's completed deposits and spins
    const todayDepositsRows = await query(
      'SELECT COALESCE(SUM(CEIL(amount)), 0) as todayDeposits FROM deposits WHERE user_id = ? AND status = "completed" AND created_at >= CURDATE()',
      [req.user.id]
    );
    const todayDeposits = parseFloat(todayDepositsRows[0]?.todayDeposits || 0);

    const todaySpinsRows = await query(
      'SELECT COUNT(*) as todaySpinsUsed FROM spin_rewards WHERE user_id = ? AND created_at >= CURDATE()',
      [req.user.id]
    );
    const todaySpinsUsed = parseInt(todaySpinsRows[0]?.todaySpinsUsed || 0, 10);

    let totalSpinsEarned = 0;
    if (todayDeposits >= 200) totalSpinsEarned += 1;
    if (todayDeposits >= 1000) totalSpinsEarned += 1;
    if (todayDeposits >= 1300) totalSpinsEarned += 1;
    if (todayDeposits >= 2000) totalSpinsEarned += 1;

    const todaySpinsLeft = Math.max(0, totalSpinsEarned - todaySpinsUsed);

    // Calculate seconds until next daily reset on the server timezone
    const resetTimeRows = await query(
      'SELECT UNIX_TIMESTAMP(CURDATE() + INTERVAL 1 DAY) - UNIX_TIMESTAMP(NOW()) as secondsUntilReset'
    );
    const secondsUntilReset = parseInt(resetTimeRows[0]?.secondsUntilReset || 0, 10);
    const resetTime = Date.now() + secondsUntilReset * 1000;

    return res.json({
      user: {
        id: String(req.user.id),
        _id: String(req.user.id),
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email,
        avatar: req.user.profile_pic || '/avatars/Avatar_1.jpg',
        walletBalance: parseFloat(wallet.wallet_balance || 0),
        availableBalance: parseFloat(wallet.wallet_balance || 0),
        lockedBalance: parseFloat(wallet.locked_balance || 0),
        bonusBalance: parseFloat(wallet.bonus_balance || 0),
        requiredWager: parseFloat(wallet.required_wager || 0),
        requiredBonusWager: parseFloat(wallet.required_bonus_wager || 0),
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
        todayDeposits,
        todaySpinsUsed,
        spinsLeft: todaySpinsLeft,
        resetTime,
        ordersCount: parseInt(stats.orders_count || 0, 10),
        gamesPlayed: parseInt(stats.games_played || 0, 10),
        totalWinnings: parseFloat(stats.total_winnings_won || 0)
      }
    });
  } catch (err) {
    logger.error(err, 'Error in getProfile');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

/**
 * Password reset trigger: gets the user's mobile number, generates and hashes 6-digit OTP,
 * then dispatches it via SMS Service.
 */
export const forgotPassword = async (req, res) => {
  const { phoneOrEmail } = req.body;
  if (!phoneOrEmail) return res.status(400).json({ error: 'Please enter your phone number or email to proceed.' });

  try {
    const cleanLookup = getCleanPhone(phoneOrEmail);
    const isPhone = /^\d+$/.test(cleanLookup);

    // Backend Sanitization Gate
    if (isPhone && cleanLookup.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }

    const users = await query(
      'SELECT id, phone, email FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [cleanLookup, phoneOrEmail]
    );
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "We couldn't find an account matching these details. Please check your spelling or register for a new account." });
    }

    const phone = users[0].phone;
    if (!phone) {
      return res.status(400).json({ error: "We couldn't find a mobile number linked to this account." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // CRITICAL: Ensure the database write finishes cleanly BEFORE SMS dispatch fires
    await query(
      'INSERT INTO otp_tokens (email, otp_hash, type, expires_at) VALUES (?, ?, "RESET_PASSWORD", DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [phone, otpHash]
    );

    const smsResult = await sendSMSVerification(phone, otp);

    // If SMS gateway fails, return 502 — fail loudly in production
    if (!smsResult.success) {
      logger.error(`[SMS] forgotPassword failed for ${phone}: ${smsResult.error}`);
      return res.status(502).json({ error: 'We were unable to deliver the verification code. Please try again shortly.' });
    }

    return res.status(200).json({ message: 'Verification code sent to your registered mobile number.' });
  } catch (error) {
    logger.error(error, 'Error in forgotPassword');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

/**
 * Resets the password after matching the phone number token hash.
 */
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Please fill in all the required fields.' });
  }

  const connection = await pool.getConnection();
  try {
    const cleanLookup = getCleanPhone(email);
    const otpStr = String(otp).trim();

    // Backend Sanitization Gate
    if (otpStr.length !== 6 || !/^\d+$/.test(otpStr)) {
      connection.release();
      return res.status(400).json({ error: 'Please enter the complete 6-digit verification code.' });
    }

    const users = await connection.query(
      'SELECT phone, email FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [cleanLookup, email]
    );
    if (!users[0] || users[0].length === 0) {
      connection.release();
      return res.status(404).json({ error: "We couldn't find an account matching these details." });
    }

    const phone = users[0][0].phone;
    const userEmail = users[0][0].email;

    const otpHash = crypto.createHash('sha256').update(otpStr).digest('hex');
    const tokens = await connection.query(
      'SELECT id FROM otp_tokens WHERE email = ? AND otp_hash = ? AND type = "RESET_PASSWORD" AND expires_at > NOW() LIMIT 1',
      [phone, otpHash]
    );
    
    if (!tokens[0] || tokens[0].length === 0) {
      connection.release();
      return res.status(400).json({ error: 'The verification code you entered is invalid or has expired. Please request a new code.' });
    }

    await connection.beginTransaction();

    await connection.query('DELETE FROM otp_tokens WHERE id = ?', [tokens[0][0].id]);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await connection.query('UPDATE users SET password_hash = ? WHERE email = ?', [hashedPassword, userEmail]);

    // Fetch user details for SECURITY notification inside the transaction
    const [userRows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [userEmail]);
    if (userRows.length > 0) {
      await createNotification(
        userRows[0].id,
        'Security Alert: Password Updated',
        'Your password has been successfully updated/reset.',
        'SECURITY',
        connection
      );
    }

    await connection.commit();
    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Error in resetPassword');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    connection.release();
  }
};

export const getReferralSignups = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT u.id, u.phone, r.created_at ' +
      'FROM referrals r ' +
      'JOIN users u ON r.referred_id = u.id ' +
      'WHERE r.referrer_id = ? ORDER BY r.created_at DESC',
      [req.user.id]
    );
    
    const referrals = rows.map(row => {
      const rawPhone = String(row.phone || '').trim();
      const maskedPhone = rawPhone.length > 4 ? '******' + rawPhone.slice(-4) : '****';
      return {
        id: row.id,
        phone: maskedPhone,
        created_at: row.created_at
      };
    });
    
    return res.json(referrals);
  } catch (err) {
    logger.error(err, 'Failed to fetch referral signups');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
};
