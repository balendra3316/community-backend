import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/subscription.controller';

const router = express.Router();

router.post('/create-order', protect, createRazorpayOrder);
router.post('/verify-payment', protect, verifyRazorpayPayment);

export default router;