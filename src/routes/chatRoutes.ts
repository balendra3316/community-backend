import express, { Router } from 'express';
import { sendMessage, healthCheck } from '../controllers/chatController';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import cors, { CorsOptions } from 'cors';

const router: Router = express.Router();

const corsOptions: CorsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};


router.use(cors(corsOptions));


const chatLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, 
  message: {
    success: false,
    error: 'Too many requests'
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Apply rate limiting
router.use(chatLimiter);

// Routes
router.post('/chat', sendMessage);
router.get('/chat/health', healthCheck);

export default router;