import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { query } from '../config/db.js';
import { createNotification } from '../utils/notifier.js';

// Encryption/Decryption helpers for 2FA base32 secrets
const encryptSecret = (text) => {
  if (!text) return '';
  const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_for_totp_encryption_32_bytes_long';
  const key = crypto.createHash('sha256').update(String(secretKey)).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

const decryptSecret = (cipherText) => {
  if (!cipherText) return '';
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    return cipherText; // Fallback for legacy plaintext
  }
  
  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const secretKey = process.env.JWT_SECRET || 'fallback_secret_key_for_totp_encryption_32_bytes_long';
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


// Helper to generate standard admin token with verified state
const generateAdminToken = (id, role, adminVerified = false) => {
  return jwt.sign(
    { id, role, adminVerified }, 
    process.env.JWT_SECRET, 
    { expiresIn: '12h' }
  );
};

// Helper to generate temporary short-lived 2FA token (5 minutes)
const generateTemp2FaToken = (id, role) => {
  return jwt.sign(
    { id, role, purpose: 'admin_2fa_verification' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
};

// --- NEW PROFILE-GATED 2FA FLOW ---

export const get2FaStatus = async (req, res) => {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
  }

  try {
    const users = await query(
      'SELECT is_two_factor_enabled, two_factor_secret, name, phone FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];

    // If 2FA is not enabled (i.e. first visit), generate/retrieve secret & show QR
    if (!user.is_two_factor_enabled) {
      let secret = user.two_factor_secret ? decryptSecret(user.two_factor_secret) : null;
      
      if (!secret) {
        const generated = speakeasy.generateSecret({
          name: `Playnixclub:${user.name} (${user.phone})`,
          length: 20
        });
        secret = generated.base32;
        await query('UPDATE users SET two_factor_secret = ? WHERE id = ?', [encryptSecret(secret), req.user.id]);
      }

      const otpauthUrl = `otpauth://totp/Playnixclub:${encodeURIComponent(user.name)}%20(${user.phone})?secret=${secret}&issuer=Playnixclub`;
      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

      return res.status(200).json({
        isSetup: false,
        qrCode: qrCodeDataUrl,
        message: 'First-time administrative access setup. Please scan the QR code using Google Authenticator.'
      });
    }

    // Subsequent visits: only TOTP input is needed
    return res.status(200).json({
      isSetup: true,
      message: 'Administrative session authorization required.'
    });

  } catch (error) {
    logger.error(error, 'Error in get2FaStatus controller');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

export const verify2FaSession = async (req, res) => {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Google Authenticator verification code is required.' });
  }

  try {
    const users = await query(
      'SELECT is_two_factor_enabled, two_factor_secret, name, phone, email, role FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];

    if (!user.two_factor_secret) {
      return res.status(400).json({ error: '2FA secret is not configured.' });
    }

    const verified = speakeasy.totp.verify({
      secret: decryptSecret(user.two_factor_secret),
      encoding: 'base32',
      token: code,
      window: 2 // Allow +/- 60s time drift
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid authentication code. Please check Google Authenticator.' });
    }

    // If it was first setup, mark as enabled in DB
    if (!user.is_two_factor_enabled) {
      await query('UPDATE users SET is_two_factor_enabled = 1 WHERE id = ?', [req.user.id]);
      await createNotification(
        req.user.id,
        'Security Update: 2FA Enabled',
        'Google Authenticator 2-factor authentication has been successfully enabled on your account.',
        'SECURITY'
      );
    }

    // Issue new administrative token with adminVerified = true
    const token = generateAdminToken(req.user.id, user.role, true);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: String(req.user.id),
        _id: String(req.user.id),
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    logger.error(error, 'Error in verify2FaSession controller');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

// --- LEGACY (DIRECT LOGIN) ENDPOINTS ---
// Kept for backward compatibility and fallback access

export const adminLogin = async (req, res) => {
  const phoneOrEmail = req.body.phoneOrEmail || req.body.username;
  const { password } = req.body;

  if (!phoneOrEmail || !password) {
    return res.status(400).json({ error: 'Phone number/Email and password are required' });
  }

  try {
    const users = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.password_hash, u.role, u.status, 
              u.is_two_factor_enabled, u.two_factor_secret,
              w.balance as wallet_balance, w.bonus_balance
       FROM users u
       LEFT JOIN wallets w ON u.id = w.user_id
       WHERE (u.phone = ? OR u.email = ?) AND u.role IN ('admin', 'super_admin') LIMIT 1`,
      [phoneOrEmail, phoneOrEmail]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This administrative account is suspended or inactive.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    if (user.is_two_factor_enabled) {
      const tempToken = generateTemp2FaToken(user.id, user.role);
      return res.status(200).json({
        status: '2FA_REQUIRED',
        temporaryToken: tempToken,
        message: 'Google Authenticator (TOTP) verification code is required.'
      });
    }

    const token = generateAdminToken(user.id, user.role, true);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });
    return res.status(200).json({
      token,
      user: {
        id: String(user.id),
        _id: String(user.id),
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        walletBalance: parseFloat(user.wallet_balance || 0),
        bonusBalance: parseFloat(user.bonus_balance || 0)
      }
    });

  } catch (error) {
    logger.error(error, 'Error in admin login controller');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

export const verify2FA = async (req, res) => {
  const { code, temporaryToken } = req.body;

  if (!code || !temporaryToken) {
    return res.status(400).json({ error: 'Verification code and temporary token are required.' });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(temporaryToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Temporary token has expired or is invalid.' });
    }

    if (decoded.purpose !== 'admin_2fa_verification') {
      return res.status(401).json({ error: 'Invalid authentication context.' });
    }

    const users = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.two_factor_secret,
              w.balance as wallet_balance, w.bonus_balance
       FROM users u
       LEFT JOIN wallets w ON u.id = w.user_id
       WHERE u.id = ? AND u.role IN ('admin', 'super_admin') LIMIT 1`,
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    const user = users[0];

    const plainSecret = decryptSecret(user.twoFactorSecret || user.two_factor_secret);
    if (!plainSecret) {
      return res.status(400).json({ error: '2FA secret not configured for this user.' });
    }

    const verified = speakeasy.totp.verify({
      secret: plainSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid Google Authenticator code. Please check your authenticator app.' });
    }

    const token = generateAdminToken(user.id, user.role, true);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });
    return res.status(200).json({
      token,
      user: {
        id: String(user.id),
        _id: String(user.id),
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        walletBalance: parseFloat(user.wallet_balance || 0),
        bonusBalance: parseFloat(user.bonus_balance || 0)
      }
    });

  } catch (error) {
    logger.error(error, 'Error in verify2FA controller');
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};
