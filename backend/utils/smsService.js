import axios from 'axios';
import { query } from '../config/db.js';
import logger from './logger.js';
import { decryptConfigValue } from './configEncryption.js';

/**
 * Fetches the Renflair SMS API key from the database (primary) or environment variables (fallback).
 * Throws a hard fatal error if the key is not configured — never silently fails.
 */
const getSMSApiKey = async () => {
  try {
    const configRows = await query(
      'SELECT config_value FROM system_configs WHERE config_key = "RENFLAIR_SMS_API_KEY" LIMIT 1'
    );
    if (configRows && configRows.length > 0 && configRows[0].config_value) {
      const raw = configRows[0].config_value;
      const decrypted = decryptConfigValue(raw);
      if (decrypted && decrypted.trim().length > 0) {
        return decrypted.trim();
      }
    }
  } catch (dbErr) {
    logger.error(dbErr, '[SMS] Failed to read RENFLAIR_SMS_API_KEY from system_configs — falling back to ENV');
  }

  const envKey = process.env.RENFLAIR_SMS_API_KEY;
  if (!envKey || envKey.trim().length === 0) {
    throw new Error('FATAL: RENFLAIR_SMS_API_KEY is not configured. Set it via Admin → Env & Credentials or the .env file.');
  }
  return envKey.trim();
};

/**
 * Normalises a phone number to a clean 10-digit Indian mobile number.
 * @param {string} phone
 * @returns {string} 10-digit number
 */
const normalisePhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.substring(2);
  if (digits.length === 11 && digits.startsWith('0'))  return digits.substring(1);
  return digits;
};

/**
 * Validates that the Renflair gateway response body indicates success.
 * Renflair returns plain-text messages; we check for known failure tokens.
 * @param {string} body
 * @throws {Error} if the body contains an error indicator
 */
const assertRenflairSuccess = (body) => {
  const lower = body.toLowerCase().trim();

  // Known Renflair error response patterns
  const FAILURE_TOKENS = ['error', 'invalid', 'failed', 'unauthorized', 'blocked',
                          'not found', 'limit exceeded', 'wrong api', 'authentication',
                          'inactive', 'expire', 'insufficient'];

  for (const token of FAILURE_TOKENS) {
    if (lower.includes(token)) {
      throw new Error(`Renflair gateway rejected the request: "${body.trim()}"`);
    }
  }
};

/**
 * Executes a single HTTP attempt to the Renflair SMS gateway.
 * @param {string} apiKey
 * @param {string} phone  10-digit normalised phone
 * @param {string|number} otp
 * @param {number} timeoutMs
 * @returns {Promise<string>} raw response body
 */
const callRenflairGateway = async (apiKey, phone, otp, timeoutMs = 10000) => {
  const url = `https://sms.renflair.in/V1.php?API=${apiKey}&PHONE=${phone}&OTP=${otp}`;

  const response = await axios.get(url, {
    timeout: timeoutMs,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/plain, */*',
      'Connection': 'keep-alive',
    },
    validateStatus: null, // Handle all HTTP status codes manually
  });

  if (response.status !== 200) {
    throw new Error(`Renflair returned HTTP ${response.status}`);
  }

  const body = typeof response.data === 'object'
    ? JSON.stringify(response.data)
    : String(response.data ?? '');

  return body;
};

/**
 * Production SMS OTP dispatcher — Renflair Gateway.
 *
 * Features:
 *  - Reads API key from DB (encrypted) or ENV at call time (no caching — always fresh)
 *  - Validates phone number format before dispatching
 *  - Attempts delivery up to MAX_RETRIES times with exponential back-off
 *  - Validates Renflair response body for known error patterns
 *  - Logs success and failure with masked phone/key for GDPR compliance
 *  - Never simulates — fails loudly in production so issues are visible immediately
 *
 * @param {string} phoneNumber - Target mobile number (10-digit, or with country code)
 * @param {string|number} numericOTP - 6-digit numeric OTP
 * @returns {Promise<{ success: true, responseData: string } | { success: false, error: string }>}
 */
export const sendSMSVerification = async (phoneNumber, numericOTP) => {
  const MAX_RETRIES   = 3;
  const BASE_DELAY_MS = 800; // exponential back-off base

  // ── 1. Resolve API key (fresh from DB each call) ────────────────────────────
  let apiKey;
  try {
    apiKey = await getSMSApiKey();
  } catch (keyErr) {
    logger.error(keyErr, '[SMS] Cannot dispatch OTP — API key missing');
    return { success: false, error: 'SMS service is not configured. Contact the platform administrator.' };
  }

  // ── 2. Normalise & validate phone ───────────────────────────────────────────
  const phone = normalisePhone(phoneNumber);
  if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
    logger.error(`[SMS] Invalid phone after normalisation: "${phone}" (original: "${phoneNumber}")`);
    return { success: false, error: 'Invalid phone number format — must be a 10-digit Indian mobile number.' };
  }

  // Masked values for secure logging
  const maskedPhone  = `+91 ******${phone.slice(-4)}`;
  const maskedApiKey = apiKey.length > 6
    ? `${apiKey.substring(0, 4)}${'*'.repeat(apiKey.length - 6)}${apiKey.slice(-2)}`
    : '****';

  logger.info(`[SMS] Dispatching OTP to ${maskedPhone} via Renflair (key: ${maskedApiKey})`);

  // ── 3. Retry loop ────────────────────────────────────────────────────────────
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const timeoutMs = 10000 + (attempt - 1) * 3000; // 10s, 13s, 16s
      const body = await callRenflairGateway(apiKey, phone, numericOTP, timeoutMs);

      // Validate gateway response for known error patterns
      assertRenflairSuccess(body);

      logger.info(`[SMS] ✓ Delivered to ${maskedPhone} on attempt ${attempt}. Gateway: "${body.trim().substring(0, 80)}"`);
      return { success: true, responseData: body.trim() };

    } catch (err) {
      lastError = err;
      const isTransient = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' ||
                          err.code === 'ECONNABORTED' || err.message.includes('timeout') ||
                          err.message.includes('socket hang up');

      if (attempt < MAX_RETRIES && isTransient) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 800ms, 1600ms
        logger.warn(`[SMS] Attempt ${attempt}/${MAX_RETRIES} failed (${err.code || err.message}). Retrying in ${delay}ms…`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // Non-transient error (gateway rejection, bad API key, etc.) — break immediately
      if (!isTransient) break;
    }
  }

  // ── 4. All attempts exhausted ────────────────────────────────────────────────
  logger.error(lastError, `[SMS] ✗ All ${MAX_RETRIES} delivery attempts failed for ${maskedPhone}`);
  return {
    success: false,
    error: lastError?.message || 'SMS delivery failed after multiple attempts.'
  };
};
