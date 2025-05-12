// src/routes/admin.routes.ts
import express from 'express';
import { createCourse, updateCourse, deleteCourse } from '../controllers/admin/course.controller';
import { createSection, updateSection, deleteSection } from '../controllers/admin/section.controller';
import { 
  createLessonInCourse, 
  createLessonInSection, 
  updateLesson, 
  deleteLesson 
} from '../controllers/admin/lesson.controller';
//import { isAuthenticated } from '../middleware/auth.middleware';
import { 
  adminLogin, 
  getCurrentAdmin, 
  adminLogout, 
  createInitialAdmin 
} from '../controllers/admin/admin.controller';
import { protectAdminRoute } from '../middleware/adminauth.middleware';
import { upload, uploadLessonFiles } from '../middleware/upload.middleware';
//import { uploadLessonFiles } from '../middleware/upload.middleware';

const router = express.Router();




// Course Management
router.post('/courses',upload.single('coverImage'), createCourse);
router.put('/courses/:courseId',upload.single('coverImage'), updateCourse);
router.delete('/courses/:courseId', deleteCourse);

// Section Management
router.post('/courses/:courseId/sections', createSection);
router.put('/sections/:sectionId', updateSection);
router.delete('/sections/:sectionId', deleteSection);

// Lesson Management
router.post('/courses/:courseId/lessons',uploadLessonFiles, createLessonInCourse);
router.post('/sections/:sectionId/lessons',uploadLessonFiles, createLessonInSection);
router.put('/lessons/:lessonId',uploadLessonFiles, updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);



// Admin authentication routes
router.post('/login', adminLogin);
router.get('/me', protectAdminRoute, getCurrentAdmin);
router.post('/logout', protectAdminRoute, adminLogout);

// Initial admin setup (protected in production)
// router.post('/setup', 
//   process.env.NODE_ENV === 'development' 
//     ? (req, res) => res.status(403).json({ message: 'Not allowed in production' }) 
//     : createInitialAdmin
// );

export default router;