import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// ─── TRANSIENT IN-MEMORY STORES FOR AUTH FAILURE RETRY LIMITS ───
const ipAttempts = new Map();
const accountAttempts = new Map();

// Configurable constants from environment variables with sensible defaults
const AUTH_WINDOW_MS = parseInt(process.env.AUTH_WINDOW_MS || '900000', 10); // 15 mins
const AUTH_BACKOFF_FACTOR_SEC = parseInt(process.env.AUTH_BACKOFF_FACTOR_SEC || '3', 10); // Exponential backoff scaling factor

/**
 * Advanced Brute-Force Rate Limiter for Authentication routes
 * Combines per-IP and per-account failure counters with exponential backoff delays.
 */
export const authRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  const identifier = req.body.phone || req.body.email || req.body.username || 'anonymous-account';

  const now = Date.now();
  const ipRecord = ipAttempts.get(ip) || { count: 0, lastAttemptAt: 0 };
  const accountRecord = accountAttempts.get(identifier) || { count: 0, lastAttemptAt: 0 };

  // Clear counters if failure window has expired
  if (ipRecord.lastAttemptAt && now - ipRecord.lastAttemptAt > AUTH_WINDOW_MS) {
    ipRecord.count = 0;
  }
  if (accountRecord.lastAttemptAt && now - accountRecord.lastAttemptAt > AUTH_WINDOW_MS) {
    accountRecord.count = 0;
  }

  // Calculate exponential backoff delays (starts applying delay after 2 failed attempts)
  const ipDelay = ipRecord.count >= 2 ? Math.pow(2, ipRecord.count - 2) * AUTH_BACKOFF_FACTOR_SEC * 1000 : 0;
  const accountDelay = accountRecord.count >= 2 ? Math.pow(2, accountRecord.count - 2) * AUTH_BACKOFF_FACTOR_SEC * 1000 : 0;

  const maxDelay = Math.max(ipDelay, accountDelay);
  const lastAttempt = Math.max(ipRecord.lastAttemptAt, accountRecord.lastAttemptAt);
  const lockoutUntil = lastAttempt + maxDelay;

  if (now < lockoutUntil) {
    const waitSeconds = Math.ceil((lockoutUntil - now) / 1000);
    logger.warn(`[Rate Limit blocked] IP ${ip} / Account ${identifier} deferred for ${waitSeconds}s`);
    return res.status(429).json({
      error: `Too many failed attempts. Please try again in ${waitSeconds} seconds.`
    });
  }

  // Intercept the json response to track authentication success or failure status
  const originalJson = res.json;
  res.json = function (data) {
    const statusCode = res.statusCode;

    // Reset counters on successful login/signups
    if (statusCode >= 200 && statusCode < 300) {
      ipAttempts.delete(ip);
      accountAttempts.delete(identifier);
    } 
    // Increment failures on bad request or credentials errors
    else if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
      ipRecord.count++;
      ipRecord.lastAttemptAt = Date.now();
      ipAttempts.set(ip, ipRecord);

      accountRecord.count++;
      accountRecord.lastAttemptAt = Date.now();
      accountAttempts.set(identifier, accountRecord);

      const nextDelaySec = Math.pow(2, Math.max(ipRecord.count, accountRecord.count) - 2) * AUTH_BACKOFF_FACTOR_SEC;
      logger.info(`[Rate Limit failure] IP: ${ip} (fails: ${ipRecord.count}), Account: ${identifier} (fails: ${accountRecord.count}). Next backoff penalty: ${nextDelaySec}s`);
    }

    return originalJson.apply(this, arguments);
  };

  next();
};

const shouldSkipRateLimit = (req) => {
  const isDev = process.env.NODE_ENV === 'development';
  const isLocal = ['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1'].some(host => 
    (req.headers.host && req.headers.host.includes(host)) || 
    (req.ip && req.ip.includes(host)) ||
    (req.headers.origin && req.headers.origin.includes(host))
  );
  return isDev || isLocal;
};

// ─── MODERATE LIMITS FOR PUBLIC ENDPOINTS ───
export const publicLimiter = rateLimit({
  windowMs: parseInt(process.env.LIMIT_PUBLIC_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.LIMIT_PUBLIC_MAX || '150', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { error: 'Too many requests on public endpoints. Please try again later.' }
});

// ─── LOOSER LIMITS FOR AUTHENTICATED USER ACTIONS ───
export const authenticatedActionLimiter = rateLimit({
  windowMs: parseInt(process.env.LIMIT_AUTH_USER_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.LIMIT_AUTH_USER_MAX || '600', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { error: 'Action rate limit exceeded. Please try again later.' }
});

// ─── WALLET TRANSACTION OPERATIONS RATE LIMITER ───
export const walletLimiter = rateLimit({
  windowMs: parseInt(process.env.LIMIT_WALLET_WINDOW_MS || '900000', 10), // 15 mins
  max: parseInt(process.env.LIMIT_WALLET_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { error: 'Too many wallet operations. Please try again later.' }
});
