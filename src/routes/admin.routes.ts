
import express from 'express';
import { createCourse, updateCourse, deleteCourse } from '../controllers/admin/course.controller';
import { createSection, updateSection, deleteSection } from '../controllers/admin/section.controller';
import { 
  createLessonInCourse, 
  createLessonInSection, 
  updateLesson, 
  deleteLesson 
} from '../controllers/admin/lesson.controller';

import { 
  adminLogin, 
  getCurrentAdmin, 
  adminLogout, 
  createInitialAdmin 
} from '../controllers/admin/admin.controller';
import { protectAdminRoute } from '../middleware/adminauth.middleware';
import { upload, uploadLessonFiles } from '../middleware/upload.middleware';
import { getAllCourses, getAllCoursesAdmin,  getCourseDetails, getCourseDetailsAdmin } from '../controllers/course.controller';


const router = express.Router();





router.get('/courses', getAllCoursesAdmin);
router.get('/courses/:courseId', getCourseDetailsAdmin);
router.post('/courses',protectAdminRoute,upload.single('coverImage'), createCourse);
router.put('/courses/:courseId',protectAdminRoute,upload.single('coverImage'), updateCourse);
router.delete('/courses/:courseId',protectAdminRoute, deleteCourse);


router.post('/courses/:courseId/sections',protectAdminRoute, createSection);
router.put('/sections/:sectionId',protectAdminRoute, updateSection);
router.delete('/sections/:sectionId',protectAdminRoute, deleteSection);


router.post('/courses/:courseId/lessons',protectAdminRoute,uploadLessonFiles, createLessonInCourse);
router.post('/sections/:sectionId/lessons',protectAdminRoute,uploadLessonFiles, createLessonInSection);
router.put('/lessons/:lessonId',protectAdminRoute,uploadLessonFiles, updateLesson);
router.delete('/lessons/:lessonId',protectAdminRoute, deleteLesson);




router.post('/login', adminLogin);
router.get('/me', protectAdminRoute, getCurrentAdmin);
router.post('/logout', protectAdminRoute, adminLogout);
// router.post('/setup',createInitialAdmin)







export default router;