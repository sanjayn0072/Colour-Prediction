import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
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
  loginSchema,
  firebaseLoginSchema,
  placeBetSchema,
  withdrawalSchema,
  depositSchema,
  createDepositOrderSchema
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

dotenv.config();

// Ensure JWT secret is securely configured
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'cplay_jwt_secret') {
  logger.error('\n❌ FATAL SECURITY ERROR: process.env.JWT_SECRET is unset, unsafe, or set to default fallback key. Server startup terminated.\n');
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cookieParser());

const server = http.createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'https://colourplay.pages.dev'];

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

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many authentication attempts. Try again later.' }
});

const walletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many wallet operations. Try again later.' }
});

// Middlewares
import { protect } from './middleware/authMiddleware.js';
import { checkRole } from './middleware/roleMiddleware.js';

// ─── AUTHENTICATION ENDPOINTS ───
app.post('/api/auth/send-otp', authLimiter, validate(sendOtpSchema), authController.sendOtp);
app.post('/api/auth/verify-register', authLimiter, validate(verifyRegisterSchema), authController.verifyOtpRegister);
app.post('/api/auth/register', authLimiter, authController.register); // Deprecated
app.post('/api/auth/login', authLimiter, validate(loginSchema), authController.login);
app.post('/api/auth/firebase-login', authLimiter, validate(firebaseLoginSchema), authController.firebaseLogin);
app.get('/api/auth/profile', protect, authController.getProfile);

// ─── WALLET TRANSACTION ENDPOINTS ───
app.post('/api/wallet/link-bank', protect, walletLimiter, walletController.linkBank);
app.post('/api/wallet/link-upi', protect, walletLimiter, walletController.linkUpi);
app.delete('/api/wallet/payment-methods/:type', protect, walletController.deletePaymentMethod);
app.post('/api/wallet/withdraw', protect, walletLimiter, validate(withdrawalSchema), walletController.handleWithdrawal);
app.post('/api/wallet/create-deposit-order', protect, walletLimiter, validate(createDepositOrderSchema), walletController.createDepositOrder);
app.post('/api/wallet/deposit', protect, validate(depositSchema), walletController.deposit);
app.get('/api/wallet/transactions', protect, walletController.getTransactions);
app.post('/api/wallet/claim-vip', protect, walletLimiter, walletController.claimVipReward);

// ─── MANUAL WITHDRAWAL SYSTEM ENDPOINTS ───
app.post('/api/withdraw', protect, walletLimiter, withdrawalController.createWithdrawal);
app.get('/api/withdraw/history', protect, withdrawalController.getWithdrawalHistory);
app.get('/api/admin/withdrawals', protect, checkRole(['super_admin', 'admin']), withdrawalController.getAdminWithdrawals);
app.put('/api/admin/withdrawals/:id/approve', protect, checkRole(['super_admin']), withdrawalController.approveWithdrawal);
app.put('/api/admin/withdrawals/:id/reject', protect, checkRole(['super_admin']), withdrawalController.rejectWithdrawal);
app.put('/api/admin/withdrawals/:id/mark-paid', protect, checkRole(['super_admin']), withdrawalController.markPaidWithdrawal);
app.post('/api/games/place-bet', protect, validate(placeBetSchema), gameController.placeBet);
app.get('/api/games/my-bets', protect, gameController.getMyBets);
app.post('/api/games/verify', gameController.verifyGame);
app.post('/api/games/spin', protect, gameController.triggerSpin);

// ─── SUPPORT AND COMPLAINTS ───
app.post('/api/support/complaint', protect, supportController.createComplaint);
app.get('/api/support/complaints', protect, supportController.getComplaints);
app.post('/api/support/chat', protect, supportController.chatWithSupport);

// ─── NOTIFICATIONS ───
app.get('/api/notifications', protect, notificationController.getNotifications);
app.put('/api/notifications/:id/read', protect, notificationController.markAsRead);

// ─── ADMIN DASHBOARD ENDPOINTS ───
app.get('/api/admin/metrics', protect, checkRole(['super_admin', 'admin']), adminController.getMetrics);
app.get('/api/admin/logs', protect, checkRole(['super_admin', 'admin']), adminController.getLogs);

// ─── ADMIN FRAUD & RISK MANAGEMENT ───
app.get('/api/admin/risk-alerts', protect, checkRole(['super_admin', 'admin']), adminController.getRiskAlerts);
app.put('/api/admin/risk-alerts/:id/resolve', protect, checkRole(['super_admin']), adminController.resolveRiskAlert);

// ─── FINANCIAL ANALYTICS & OVERRIDES ───
app.get('/api/admin/analytics/finances', protect, checkRole(['super_admin', 'admin']), adminController.getFinancialAnalytics);
app.put('/api/admin/games/:id/override', protect, checkRole(['super_admin']), adminController.overrideGameOutcome);

// ─── SUPER ADMIN ADVANCED MANAGEMENT ENDPOINTS ───
app.get('/api/admin/users', protect, checkRole(['super_admin']), adminController.getAdminUsers);
app.get('/api/admin/users/:id/history', protect, checkRole(['super_admin']), adminController.getUserHistory);
app.put('/api/admin/users/:id/status', protect, checkRole(['super_admin']), adminController.updateUserStatus);
app.put('/api/admin/users/:id/balance', protect, checkRole(['super_admin']), adminController.adjustUserBalance);
app.get('/api/admin/orders', protect, checkRole(['super_admin']), adminController.getAdminOrders);
app.put('/api/admin/orders/:id/status', protect, checkRole(['super_admin']), adminController.updateOrderStatus);
app.get('/api/admin/complaints', protect, checkRole(['super_admin']), adminController.getAdminComplaints);
app.put('/api/admin/complaints/:id', protect, checkRole(['super_admin']), adminController.updateComplaintStatus);
app.get('/api/admin/coupons', protect, checkRole(['super_admin']), adminController.getCoupons);
app.post('/api/admin/coupons', protect, checkRole(['super_admin']), adminController.createCoupon);
app.delete('/api/admin/coupons/:id', protect, checkRole(['super_admin']), adminController.deleteCoupon);
app.get('/api/admin/spin-configs', protect, checkRole(['super_admin']), adminController.getSpinConfigs);
app.put('/api/admin/spin-configs/:id', protect, checkRole(['super_admin']), adminController.updateSpinConfig);
app.get('/api/admin/games', protect, checkRole(['super_admin']), adminController.getGames);
app.put('/api/admin/games/:id/status', protect, checkRole(['super_admin']), adminController.updateGameStatus);


// ─── CATALOG AND STORE ENDPOINTS ───
app.get('/api/products', catalogController.getProducts);
app.post('/api/products/checkout', protect, catalogController.checkoutProduct);
app.post('/api/products', protect, checkRole(['super_admin']), catalogController.createProduct);
app.put('/api/products/:id', protect, checkRole(['super_admin']), catalogController.updateProduct);
app.delete('/api/products/:id', protect, checkRole(['super_admin']), catalogController.deleteProduct);

app.get('/api/banners', catalogController.getBanners);
app.post('/api/banners', protect, checkRole(['super_admin']), catalogController.createBanner);
app.put('/api/banners/:id', protect, checkRole(['super_admin']), catalogController.updateBanner);
app.delete('/api/banners/:id', protect, checkRole(['super_admin']), catalogController.deleteBanner);

// ─── CENTRALIZED PROVABLY FAIR GAME STATE LOOPS ───
gameController.initializeGameLoop(io);

// Socket.io JWT Authentication Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query(
      'SELECT u.id, u.role, w.balance as wallet_balance FROM users u JOIN wallets w ON u.id = w.user_id WHERE u.id = ? LIMIT 1',
      [decoded.id]
    );
    if (!users || users.length === 0) {
      return next(new Error('Authentication error: User not found'));
    }
    socket.user = users[0];
    next();
  } catch (err) {
    next(new Error('Authentication error: Token invalid'));
  }
});

// ─── SOCKET.IO CONNECTIONS ───
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join_dice_lobby', async () => {
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
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

app.use((err, req, res, next) => {
  logger.error(err, 'Unhandled request error');
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Zero-Trust server running on port ${PORT}`);
});
