












import express from 'express';
import { 
  getAllCourses, 
  getCourseDetails, 
  purchaseCourse, 
  getUserPurchasedCourses,
  getPaymentHistory, 
  getPublicCourseInfo,
  getCourseAccessDetails
} from '../controllers/course.controller';
import { protect } from '../middleware/auth.middleware'; // Assume you have this middleware
import { toggleLessonCompletion } from '../controllers/progress.controller';

const router = express.Router();


router.get('/',protect, getAllCourses); // This will return only free courses for non-authenticated users


router.get('/purchased',  getUserPurchasedCourses);
router.get('/payments', protect, getPaymentHistory);
router.post('/purchase', protect, purchaseCourse);
router.get('/:courseId',protect, getCourseDetails);


router.post('/progress/toggle', protect, toggleLessonCompletion);


router.get('/public/:courseId', getPublicCourseInfo);
router.get('/access-details/:courseId',protect, getCourseAccessDetails)



export default router;