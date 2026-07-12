import crypto from 'crypto';
import logger from './logger.js';

/**
 * Derives a consistent 32-byte key from process.env.ENCRYPTION_KEY or process.env.JWT_SECRET.
 * Emits warnings and logs fallback key state if missing.
 */
const getEncryptionKey = () => {
  const envKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!envKey) {
    throw new Error('FATAL: ENCRYPTION_KEY or JWT_SECRET is not configured in environment variables.');
  }
  return crypto.createHash('sha256').update(String(envKey)).digest();
};

/**
 * Encrypts a configuration plaintext value using AES-256-GCM.
 * Returns formatted string: ivHex:authTagHex:encryptedHex
 * @param {string|number} plainText
 * @returns {string}
 */
export const encryptConfigValue = (plainText) => {
  if (plainText === undefined || plainText === null) return '';
  const textStr = String(plainText).trim();
  if (textStr === '') return '';

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // GCM standard IV size
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(textStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    logger.error(err, 'Failed to encrypt configuration value');
    return String(plainText);
  }
};

/**
 * Decrypts an AES-256-GCM encrypted configuration value.
 * Gracefully returns original text if not encrypted (supports legacy plaintext compatibility).
 * @param {string} cipherText
 * @returns {string}
 */
export const decryptConfigValue = (cipherText) => {
  if (!cipherText) return '';
  
  const textStr = String(cipherText).trim();
  const parts = textStr.split(':');
  if (parts.length !== 3) {
    return textStr; // Return plaintext directly (legacy compatibility)
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails, log it and return the raw text as fallback
    logger.error(err, 'Failed to decrypt configuration value. Returning raw ciphertext.');
    return textStr;
  }
};
