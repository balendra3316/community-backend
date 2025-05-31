
import express from 'express';
import { 
  getAllTimeLeaderboard,
  getWeeklyLeaderboard, 
  getMonthlyLeaderboard 
} from '../controllers/leaderboard.controller';
import { protect } from "../middleware/auth.middleware";

const router = express.Router();


router.get('/all-time',protect, getAllTimeLeaderboard);


router.get('/weekly',protect, getWeeklyLeaderboard);


router.get('/monthly',protect, getMonthlyLeaderboard);

export default router;