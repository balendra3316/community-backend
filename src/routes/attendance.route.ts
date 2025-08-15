import express from 'express';
import { exportAllAttendance, getAttendanceData, markAttendance, registerUser } from '../controllers/attendance.controller';
import { protectAdminRoute } from '../middleware/adminauth.middleware';


import { SCmarkAttendance, checkTodayAttendance } from '../controllers/attendance.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Route: POST /api/attendance/mark
router.post('/mark', markAttendance);
router.get('/get',  getAttendanceData)

router.post('/register', registerUser);

router.get('/export-all',protectAdminRoute , exportAllAttendance);


// new route for community attendace







// Route to mark attendance from community
router.post('/mark-starclub', protect, SCmarkAttendance);


router.get('/check', protect, checkTodayAttendance);


export default router;