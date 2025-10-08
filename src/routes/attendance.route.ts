import express from 'express';
import { exportAllAttendance, getAttendanceData} from '../controllers/attendance.controller';
import { protectAdminRoute } from '../middleware/adminauth.middleware';


import { SCmarkAttendance, checkTodayAttendance } from '../controllers/attendance.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();


// admin route for attendance

router.get('/get',  getAttendanceData)



router.get('/export-all',protectAdminRoute , exportAllAttendance);


// new route for community attendace








// Route to mark attendance from community
router.post('/mark-starclub', protect, SCmarkAttendance);


router.get('/check', protect, checkTodayAttendance);


export default router;