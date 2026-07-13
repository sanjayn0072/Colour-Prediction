import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { checkRole } from '../middleware/roleMiddleware.js';
import * as depositController from '../controllers/depositController.js';
import { uploadScreenshot, verifyUploadMagicBytes } from '../utils/uploadService.js';

const router = express.Router();

// Outbound order creation via Pay0 redirect
router.post('/create', protect, depositController.createDeposit);

// Public payment callback webhook
router.post('/webhook', depositController.pay0Webhook);

// User deposit history records lookup
router.get('/history', protect, depositController.getDepositHistory);

// Active coupons available for the player
router.get('/coupons', protect, depositController.getUserCoupons);

// User claims a no-deposit coupon (GAMEPLAY_FREEBIE)
router.post('/coupons/claim', protect, depositController.claimNoDepositCoupon);

// User deposit dispute appeal submission (with screenshot file upload)
router.post('/appeal', protect, uploadScreenshot, verifyUploadMagicBytes, depositController.submitAppeal);

// Administrative appeals queue (Super Admin / Admin level check)
router.get('/admin/appeals', protect, checkRole(['super_admin', 'admin']), depositController.getAdminAppeals);

// Administrative appeal resolution marker
router.post('/admin/appeals/:id/resolve', protect, checkRole(['super_admin', 'admin']), depositController.resolveAppeal);

export default router;
