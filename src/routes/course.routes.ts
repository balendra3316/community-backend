
// src/routes/course.routes.ts
import express from 'express';
import { getAllCourses, getCourseDetails } from '../controllers/course.controller';
import { getLessonContent } from '../controllers/lesson.controller';
import { toggleLessonCompletion } from '../controllers/progress.controller';
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

// Public routes
 router.get('/',protect, getAllCourses);
//router.get('/', getAllCourses);
router.get('/:courseId',protect, getCourseDetails);
router.get('/lessons/:lessonId', getLessonContent);

// Protected routes (require authentication)
router.post('/progress/toggle', protect, toggleLessonCompletion);

export default router;