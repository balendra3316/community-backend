import express from 'express';
import { exportAllAttendance, getAttendanceData, markAttendance, registerUser } from '../controllers/attendance.controller';
import { protectAdminRoute } from '../middleware/adminauth.middleware';

const router = express.Router();

// Route: POST /api/attendance/mark
router.post('/mark', markAttendance);
router.get('/get',  getAttendanceData)

router.post('/register', registerUser);

router.get('/export-all',protectAdminRoute , exportAllAttendance);

export default router;