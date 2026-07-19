import './config/env.js';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB, { query } from './config/db.js';
import { generateServerSeed, hashSeed, generateOutcome } from './utils/provablyFair.js';
import logger from './utils/logger.js';
import {
  validate,
  sendOtpSchema,
  verifyRegisterSchema,
  verifyEmailSchema,
  loginSchema,
  firebaseLoginSchema,
  placeBetSchema,
  withdrawalSchema,
  depositSchema,
  createDepositOrderSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  adminLoginSchema,
  adminVerify2faSchema,
  updateConfigTrafficSchema,
  updateStoreConfigSchema,
  verifyPay0DepositStatusSchema,
  updateSuperAdminConfigSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  adjustUserBalanceSchema,
  updateOrderStatusSchema,
  updateComplaintStatusSchema,
  createCouponSchema,
  updateSpinConfigSchema,
  updateGameStatusSchema,
  checkoutProductSchema,
  createProductSchema,
  updateProductSchema,
  createBannerSchema,
  createComplaintSchema,
  chatWithSupportSchema,
  markAsReadSchema,
  profileUpdateSchema
} from './middleware/validationMiddleware.js';

// Controllers
import * as authController from './controllers/authController.js';
import * as walletController from './controllers/walletController.js';
import * as gameController from './controllers/gameController.js';
import * as catalogController from './controllers/catalogController.js';
import * as supportController from './controllers/supportController.js';
import * as notificationController from './controllers/notificationController.js';
import * as adminController from './controllers/adminController.js';
import * as withdrawalController from './controllers/withdrawalController.js';
import * as adminAuthController from './controllers/adminAuthController.js';
import depositRoutes from './routes/depositRoutes.js';
import * as depositController from './controllers/depositController.js';
import * as couponController from './controllers/couponController.js';
import { startBehavioralRewardsWorker } from './utils/rewardsWorker.js';
import { logSuspiciousNameChange } from './utils/riskEngine.js';
import { sendSuspiciousNameChangeAlert } from './utils/telegram.js';


// Ensure JWT secret is securely configured
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'cplay_jwt_secret') {
  logger.error('\n❌ FATAL SECURITY ERROR: process.env.JWT_SECRET is unset, unsafe, or set to default fallback key. Server startup terminated.\n');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cookieParser());

const server = http.createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'https://colourplay.pages.dev', "https://playnixclub.bet", "https://www.playnixclub.bet"];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST']
  }
});

// Database Connection
connectDB();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Recursive XSS sanitation helper
const sanitizeInput = (val) => {
  if (typeof val === 'string') {
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeInput);
  }
  if (typeof val === 'object' && val !== null) {
    const clean = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        clean[key] = sanitizeInput(val[key]);
      }
    }
    return clean;
  }
  return val;
};

const xssSanitizer = (req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  if (req.params) req.params = sanitizeInput(req.params);
  next();
};

app.use(xssSanitizer);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import configurable rate limiters from rateLimitMiddleware
import {
  authRateLimiter,
  publicLimiter,
  authenticatedActionLimiter,
  walletLimiter
} from './middleware/rateLimitMiddleware.js';

import { protect } from './middleware/authMiddleware.js';
import { checkRole } from './middleware/roleMiddleware.js';
import { uploadProductImage, uploadProductImages, verifyUploadMagicBytes, handleScreenshotUpload } from './utils/uploadService.js';
app.get("/api/health-api", (req, res) => {
  res.status(200).json({ success: true })
})
// ─── AUTHENTICATION ENDPOINTS ───
app.post('/api/auth/send-otp', authRateLimiter, validate(sendOtpSchema), authController.sendOtp);
app.post('/api/auth/verify-email', authRateLimiter, validate(verifyEmailSchema), authController.verifyOtpRegister);
app.post('/api/auth/forgot-password', authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
app.post('/api/auth/reset-password', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);
app.post('/api/auth/login', authRateLimiter, validate(loginSchema), authController.login);
app.post('/api/auth/logout', authController.logout);
app.get('/api/auth/referrals', protect, authenticatedActionLimiter, authController.getReferralSignups);
app.post('/api/auth/firebase-login', authRateLimiter, validate(firebaseLoginSchema), authController.firebaseLogin);
app.get('/api/auth/profile', protect, authenticatedActionLimiter, authController.getProfile);
app.put('/api/auth/profile', protect, authenticatedActionLimiter, validate(profileUpdateSchema), async (req, res) => {
  const { name, avatar, email } = req.body;
  let updatedName = req.user.name;
  try {
    // Double validation / Audit layer: intercept name bypass attempts
    if (name !== undefined && name !== null) {
      const attemptedName = String(name).trim();
      if (attemptedName !== req.user.name) {
        if (req.user.role !== 'super_admin') {
          await logSuspiciousNameChange(req.user.id, req.user.name, attemptedName);
          await sendSuspiciousNameChangeAlert(req.user.id, req.user.name, req.user.phone, req.user.name, attemptedName);
          return res.status(400).json({ error: 'Validation failed: Name is immutable.' });
        } else {
          await query('UPDATE users SET name = ? WHERE id = ?', [attemptedName, req.user.id]);
          updatedName = attemptedName;
          logger.info(`[Super Admin Name Update]: User ID ${req.user.id} updated name from "${req.user.name}" to "${attemptedName}"`);
        }
      }
    }

    if (avatar !== undefined) {
      await query('UPDATE users SET profile_pic = ? WHERE id = ?', [avatar, req.user.id]);
    }
    if (email !== undefined) {
      const cleanEmail = email ? email.trim() : '';
      if (cleanEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return res.status(400).json({ error: 'Invalid email address format' });
        }
        const existing = await query('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1', [cleanEmail, req.user.id]);
        if (existing && existing.length > 0) {
          return res.status(400).json({ error: 'Email address is already in use by another account.' });
        }
        await query('UPDATE users SET email = ? WHERE id = ?', [cleanEmail, req.user.id]);
      } else {
        const placeholderEmail = `${req.user.phone}@temp-user.com`;
        await query('UPDATE users SET email = ? WHERE id = ?', [placeholderEmail, req.user.id]);
      }
    }
    return res.json({ success: true, name: updatedName, avatar, email: email?.trim() });
  } catch (err) {
    logger.error(err, 'Failed to update user profile');
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});
app.post('/api/admin/login', authRateLimiter, validate(adminLoginSchema), adminAuthController.adminLogin);
app.post('/api/admin/login/verify-2fa', authRateLimiter, validate(adminVerify2faSchema), adminAuthController.verify2FA);
app.get('/api/admin/2fa/status', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminAuthController.get2FaStatus);
app.post('/api/admin/2fa/verify', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(adminVerify2faSchema), adminAuthController.verify2FaSession);

// ─── WALLET TRANSACTION ENDPOINTS ───
app.post('/api/wallet/link-bank', protect, walletLimiter, walletController.linkBank);
app.post('/api/wallet/link-upi', protect, walletLimiter, walletController.linkUpi);
app.delete('/api/wallet/payment-methods/:type', protect, walletLimiter, walletController.deletePaymentMethod);
app.post('/api/wallet/withdraw', protect, walletLimiter, validate(withdrawalSchema), walletController.handleWithdrawal);
app.post('/api/wallet/create-deposit-order', protect, walletLimiter, validate(createDepositOrderSchema), walletController.createDepositOrder);
app.post('/api/wallet/deposit', protect, walletLimiter, validate(depositSchema), walletController.deposit);
app.get('/api/wallet/transactions', protect, authenticatedActionLimiter, walletController.getTransactions);
app.post('/api/wallet/claim-vip', protect, walletLimiter, walletController.claimVipReward);
app.get('/api/wallet/my-coupons', protect, authenticatedActionLimiter, depositController.getUserCoupons);
// ─── MANUAL WITHDRAWAL SYSTEM ENDPOINTS ───
app.post('/api/withdraw', protect, walletLimiter, validate(withdrawalSchema), withdrawalController.createWithdrawal);
app.get('/api/withdraw/history', protect, authenticatedActionLimiter, withdrawalController.getWithdrawalHistory);
app.get('/api/admin/withdrawals', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), withdrawalController.getAdminWithdrawals);
app.put('/api/admin/withdrawals/:id/processing', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), withdrawalController.processWithdrawal);
app.put('/api/admin/withdrawals/:id/approve', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), withdrawalController.approveWithdrawal);
app.patch('/api/admin/withdrawals/:id/reject', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), withdrawalController.rejectWithdrawal);
app.post('/api/admin/game/overwrite', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), gameController.overwriteGame);
app.post('/api/games/place-bet', protect, authenticatedActionLimiter, validate(placeBetSchema), gameController.placeBet);
app.get('/api/games/leaderboard', publicLimiter, gameController.getLeaderboard);
app.get('/api/games/my-bets', protect, authenticatedActionLimiter, gameController.getMyBets);
app.get('/api/games/win-loss-stats', protect, authenticatedActionLimiter, gameController.getWinLossStats);
app.post('/api/games/verify', publicLimiter, gameController.verifyGame);
app.post('/api/games/spin', protect, authenticatedActionLimiter, gameController.triggerSpin);
app.get('/api/games/multipliers', publicLimiter, gameController.getPublicMultipliers);
app.get('/api/admin/game-center/config', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getGameCenterConfig);
app.patch('/api/admin/game-center/config', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.updateGameCenterConfig);

// ─── SUPPORT AND COMPLAINTS ───
app.post('/api/support/complaint', protect, authenticatedActionLimiter, handleScreenshotUpload, verifyUploadMagicBytes, validate(createComplaintSchema), supportController.createComplaint);
app.get('/api/support/complaints', protect, authenticatedActionLimiter, supportController.getComplaints);
app.post('/api/support/chat', protect, authenticatedActionLimiter, validate(chatWithSupportSchema), supportController.chatWithSupport);

app.get('/api/notifications', protect, authenticatedActionLimiter, notificationController.getNotifications);
app.put('/api/notifications/:id/read', protect, authenticatedActionLimiter, validate(markAsReadSchema), notificationController.markAsRead);
app.patch('/api/notifications/mark-read', protect, authenticatedActionLimiter, notificationController.markAllAsRead);


// ─── ADMIN NOTIFICATIONS ───
app.get('/api/admin/notifications', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getAdminNotifications);
app.post('/api/admin/notifications/broadcast', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.broadcastNotification);

// ─── ADMIN DASHBOARD ENDPOINTS ───
app.get('/api/admin/metrics', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getMetrics);
app.get('/api/admin/logs', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getLogs);

// ─── ADMIN CONFIG ENDPOINTS ───
app.get('/api/admin/config/traffic', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getConfigTraffic);
app.patch('/api/admin/config/traffic', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(updateConfigTrafficSchema), adminController.updateConfigTraffic);
app.get('/api/admin/store-config', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getStoreConfig);
app.post('/api/admin/verify-pay0-status', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(verifyPay0DepositStatusSchema), adminController.verifyPay0DepositStatus);

// ─── PAY0 DEPOSIT & APPEALS ROUTES ───
app.use('/api/payment', depositRoutes);
app.patch('/api/admin/store-config', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(updateStoreConfigSchema), adminController.updateStoreConfig);

// ─── SUPER ADMIN ENV CONFIG ENDPOINTS ───
app.get('/api/superadmin/config', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getSuperAdminConfig);
app.patch('/api/superadmin/config', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(updateSuperAdminConfigSchema), adminController.updateSuperAdminConfig);

// ─── ADMIN FRAUD & RISK MANAGEMENT ───
app.get('/api/admin/risk-alerts', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getRiskAlerts);
app.put('/api/admin/risk-alerts/:id/resolve', protect, authenticatedActionLimiter, checkRole(['super_admin']), adminController.resolveRiskAlert);

// ─── FINANCIAL ANALYTICS & OVERRIDES ───
app.get('/api/admin/analytics/finances', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getFinancialAnalytics);
app.put('/api/admin/games/:id/override', protect, authenticatedActionLimiter, checkRole(['super_admin']), adminController.overrideGameOutcome);

// ─── SUPER ADMIN ADVANCED MANAGEMENT ENDPOINTS ───
app.get('/api/admin/users', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getAdminUsers);
app.get('/api/admin/deposits', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getAdminDeposits);
app.post('/api/superadmin/update-user', protect, authenticatedActionLimiter, checkRole(['super_admin']), validate(updateUserRoleSchema), adminController.updateUserRole);
app.get('/api/admin/users/:id/history', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getUserHistory);
app.put('/api/admin/users/:id/status', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(updateUserStatusSchema), adminController.updateUserStatus);
app.put('/api/admin/users/:id/balance', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(adjustUserBalanceSchema), adminController.adjustUserBalance);
app.get('/api/admin/orders', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getAdminOrders);
app.put('/api/admin/orders/:id/status', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(updateOrderStatusSchema), adminController.updateOrderStatus);
app.get('/api/admin/complaints', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getAdminComplaints);
app.put('/api/admin/complaints/:id', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(updateComplaintStatusSchema), adminController.updateComplaintStatus);
app.get('/api/admin/coupons', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), couponController.getCoupons);
app.post('/api/admin/coupons', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(createCouponSchema), couponController.createCoupon);
app.put('/api/admin/coupons/:id', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(createCouponSchema), couponController.updateCoupon);
app.delete('/api/admin/coupons/:id', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), couponController.deleteCoupon);
app.get('/api/admin/spin-configs', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getSpinConfigs);
app.put('/api/admin/spin-configs/:id', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(updateSpinConfigSchema), adminController.updateSpinConfig);
app.get('/api/admin/games', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), adminController.getGames);
app.put('/api/admin/games/:id/status', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(updateGameStatusSchema), adminController.updateGameStatus);


// ─── CATALOG AND STORE ENDPOINTS ───
app.get('/api/products', publicLimiter, catalogController.getProducts);
app.post('/api/products/checkout', protect, authenticatedActionLimiter, validate(checkoutProductSchema), catalogController.checkoutProduct);
app.post('/api/admin/products', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), uploadProductImages, verifyUploadMagicBytes, validate(createProductSchema), catalogController.createProduct);
app.put('/api/admin/products/:id', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), uploadProductImages, verifyUploadMagicBytes, validate(updateProductSchema), catalogController.updateProduct);
app.delete('/api/admin/products/:id', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), catalogController.deleteProduct);

app.get('/api/banners', publicLimiter, catalogController.getBanners);
app.post('/api/banners', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), validate(createBannerSchema), catalogController.createBanner);
app.put('/api/banners/:id', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), catalogController.updateBanner);
app.delete('/api/banners/:id', protect, authenticatedActionLimiter, checkRole(['super_admin', 'admin']), catalogController.deleteBanner);

// ─── CENTRALIZED PROVABLY FAIR GAME STATE LOOPS ───
gameController.initializeGameLoop(io);

// Socket.io JWT Authentication Middleware
io.use(async (socket, next) => {
  let cookieToken = null;
  const cookieHeader = socket.handshake.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const parts = cookie.split('=');
      const key = parts[0]?.trim();
      const value = parts.slice(1).join('=')?.trim();
      if (key) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
    cookieToken = cookies.token;
  }

  const token = socket.handshake.auth?.token ||
    cookieToken ||
    socket.handshake.headers?.authorization?.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return next(new Error('Authentication error: Token missing'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query(
      'SELECT u.id, u.role, u.name, u.status, w.balance as wallet_balance FROM users u JOIN wallets w ON u.id = w.user_id WHERE u.id = ? LIMIT 1',
      [decoded.id]
    );
    if (!users || users.length === 0) {
      return next(new Error('Authentication error: User not found'));
    }
    socket.user = users[0];

    // Block suspended/locked accounts from socket connections
    if (socket.user.status && socket.user.status !== 'active') {
      return next(new Error('Authentication error: Account suspended'));
    }

    next();
  } catch (err) {
    next(new Error('Authentication error: Token invalid'));
  }
});

// ─── SOCKET.IO CONNECTIONS ───
// In-memory tracking of online admins: adminId -> { id, name, role, sockets: Set }
const activeAdmins = new Map();

const getOnlineAdminsPayload = () => {
  return {
    onlineAdmins: Array.from(activeAdmins.values()).map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      socketIds: Array.from(a.sockets)
    }))
  };
};

// In-memory rate limiter for socket room joins
const socketJoinTimestamps = new Map();
const SOCKET_JOIN_COOLDOWN_MS = 5000;

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  if (socket.user?.id) {
    socket.join(`user_room_${socket.user.id}`);
  }

  if (socket.user?.role === 'super_admin' || socket.user?.role === 'admin') {
    socket.join('admin_room');
    if (socket.user?.role === 'super_admin') {
      socket.join('super_admin_room');
    }

    const adminId = socket.user.id;
    if (socket.user?.role !== 'super_admin') {
      if (!activeAdmins.has(adminId)) {
        activeAdmins.set(adminId, {
          id: adminId,
          name: socket.user.name,
          role: socket.user.role,
          sockets: new Set()
        });
      }
      activeAdmins.get(adminId).sockets.add(socket.id);
    }

    // Broadcast status update to super_admin_room
    io.to('super_admin_room').emit('admin_status_update', getOnlineAdminsPayload());

    if (socket.user?.role === 'admin') {
      io.to('super_admin_room').emit('admin_logged_in', {
        adminId: socket.user.id,
        adminName: socket.user.name
      });
    }
  }

  socket.on('check_online_admins', () => {
    if (socket.user?.role === 'super_admin') {
      socket.emit('admin_status_update', getOnlineAdminsPayload());
    }
  });

  socket.on('join_dice_lobby', async () => {
    const now = Date.now();
    const lastJoin = socketJoinTimestamps.get(socket.id + '_dice') || 0;
    if (now - lastJoin < SOCKET_JOIN_COOLDOWN_MS) return;
    socketJoinTimestamps.set(socket.id + '_dice', now);
    socket.join('dice_room');
    let history = [];
    try {
      const records = await query(
        'SELECT gr.round_id as roundId, dgh.roll_number as outcomeNumber ' +
        'FROM dice_game_history dgh ' +
        'JOIN game_rounds gr ON dgh.game_round_id = gr.id ' +
        'JOIN games g ON gr.game_id = g.id ' +
        'WHERE g.name = "dice" AND gr.status = "completed" ' +
        'ORDER BY gr.created_at DESC LIMIT 20'
      );
      history = records.map(h => ({ id: h.roundId, roll: h.outcomeNumber, won: h.outcomeNumber >= 50 }));
    } catch (err) {
      logger.error(err, 'Failed to fetch initial dice history');
    }
    socket.emit('GAME_TICK', {
      ...gameController.currentDiceGame,
      gameType: 'dice',
      history
    });
  });

  socket.on('join_colour', async () => {
    const now = Date.now();
    const lastJoin = socketJoinTimestamps.get(socket.id + '_colour') || 0;
    if (now - lastJoin < SOCKET_JOIN_COOLDOWN_MS) return;
    socketJoinTimestamps.set(socket.id + '_colour', now);
    socket.join('colour_room_30s');
    socket.join('colour_room_1m');
    socket.join('colour_room_2m');
    socket.join('colour_room_5m');

    // Emit initial ticks for all 4 sessions immediately so client doesn't wait
    for (const key of Object.keys(gameController.currentColourGames)) {
      const game = gameController.currentColourGames[key];
      let history = [];
      try {
        const records = await query(
          'SELECT gr.round_id as roundId, cph.winning_color as winningColor, cph.winning_number as outcomeNumber ' +
          'FROM color_prediction_history cph ' +
          'JOIN game_rounds gr ON cph.game_round_id = gr.id ' +
          'JOIN games g ON gr.game_id = g.id ' +
          'WHERE g.name = ? AND gr.status = "completed" ' +
          'ORDER BY gr.created_at DESC LIMIT 20',
          [`colour_${key}`]
        );
        history = records.map(h => ({ id: h.roundId, colour: h.winningColor, number: h.outcomeNumber }));
      } catch (err) {
        logger.error(err, `Failed to fetch initial colour history for ${key}`);
      }
      socket.emit('GAME_TICK', {
        ...game,
        gameType: 'colour',
        session: key,
        history
      });
    }
  });

  socket.on('disconnect', () => {
    socketJoinTimestamps.delete(socket.id + '_dice');
    socketJoinTimestamps.delete(socket.id + '_colour');

    if (socket.user?.role === 'admin' || socket.user?.role === 'super_admin') {
      const adminId = socket.user.id;
      const adminInfo = activeAdmins.get(adminId);
      if (adminInfo) {
        adminInfo.sockets.delete(socket.id);
        if (adminInfo.sockets.size === 0) {
          activeAdmins.delete(adminId);
        }
      }

      // Broadcast status update to super_admin_room
      io.to('super_admin_room').emit('admin_status_update', getOnlineAdminsPayload());
    }

    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

app.use((err, req, res, next) => {
  logger.error(err, '[Global Error Interceptor]');
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected error occurred on the core game engine."
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  logger.info(`Zero-Trust server running on port ${PORT}`);
  console.log(`Zero-Trust server running on port ${PORT}`);

  startBehavioralRewardsWorker();
});
