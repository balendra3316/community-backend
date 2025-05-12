// src/controllers/course.controller.ts

import Course from '../models/Course.model';
import Section from '../models/Section.model';
import Lesson from '../models/Lesson.model';
import Progress from '../models/Progress.model';
import mongoose from 'mongoose';

import { Request, Response, NextFunction } from 'express';








// export const getAllCourses = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const userId = req.user?._id;
//     const courses = await Course.find().sort({ order: 1 });

//     if (userId) {
//       const courseIds = courses.map(course => course._id);
//       const progresses = await Progress.find({
//         userId,
//         courseId: { $in: courseIds }
//       });

//       const progressMap = new Map();
//       progresses.forEach(progress => {
//         progressMap.set(progress.courseId.toString(), {
//           completionPercentage: progress.completionPercentage,
//           lastAccessedLesson: progress.lastAccessedLesson
//         });
//       });

//       const coursesWithProgress = courses.map(course => {
//         const courseObject = course.toObject();
//         const progress = progressMap.get(course._id.toString());
//         return {
//           ...courseObject,
//           progress: progress || { completionPercentage: 0, lastAccessedLesson: null }
//         };
//       });

//       res.status(200).json(coursesWithProgress);
//       return;
//     }

//     res.status(200).json(courses);
//   } catch (error) {
//     console.error('Error fetching courses:', error);
//     next(error);
//   }
// };



export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const courses = await Course.find().sort({ order: 1 });

    if (userId) {
      const courseIds = courses.map(course => course._id);

      // Fetch sections and lessons
      const sections = await Section.find({ courseId: { $in: courseIds } });
      const sectionIds = sections.map(s => s._id);
      const lessons = await Lesson.find({ sectionId: { $in: sectionIds } });

      // Group lessons by course
      const courseLessonMap = new Map<string, string[]>();
      sections.forEach(section => {
        const courseId = section.courseId.toString();
        const lessonsInSection = lessons.filter(
          lesson => lesson.sectionId?.toString() === section._id.toString()
        );
        if (!courseLessonMap.has(courseId)) {
          courseLessonMap.set(courseId, []);
        }
        const lessonIds = lessonsInSection.map(l => l._id.toString());
        courseLessonMap.get(courseId)?.push(...lessonIds);
      });

      // Get user progress for all courses
      const progresses = await Progress.find({
        userId,
        courseId: { $in: courseIds }
      });

      const progressMap = new Map<string, any>();
      progresses.forEach(progress => {
        progressMap.set(progress.courseId.toString(), progress);
      });

      // Map over courses and compute progress
      const coursesWithProgress = courses.map(course => {
        const courseObj = course.toObject();
        const courseId = course._id.toString();
        const allLessonIds = courseLessonMap.get(courseId) || [];
        const progress = progressMap.get(courseId);
        const completedLessonIds = progress?.completedLessons.map((id: any) => id.toString()) || [];

        const completedCount = allLessonIds.filter(id => completedLessonIds.includes(id)).length;
        const totalLessons = allLessonIds.length;

        const completionPercentage = totalLessons > 0
          ? Math.round((completedCount / totalLessons) * 100)
          : 0;

        return {
          ...courseObj,
          progress: {
            completionPercentage
          }
        };
      });

      res.status(200).json(coursesWithProgress);
      return;
    }

    // No user: return courses without progress
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    next(error);
  }
};








    
// // Get specific course with sections, lessons and progress
// export const getCourseDetails = async (
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ): Promise<void> => {
//     try {
//       const { courseId } = req.params;
//       const userId = req.user?._id;
  
//       if (!mongoose.Types.ObjectId.isValid(courseId)) {
//         res.status(400).json({ message: 'Invalid course ID' });
//         return;
//       }
  
//       const course = await Course.findById(courseId);
//       if (!course) {
//         res.status(404).json({ message: 'Course not found' });
//         return;
//       }
  
//       const sections = await Section.find({ courseId }).sort({ order: 1 });
//       const lessons = await Lesson.find({ courseId }).sort({ order: 1 });
  
//       const sectionMap = new Map<string, any>();
//       sections.forEach(section => {
//         sectionMap.set(section._id.toString(), {
//           ...section.toObject(),
//           lessons: []
//         });
//       });
  
//       lessons.forEach(lesson => {
//         const lessonObj = lesson.toObject();
//         if (lesson.sectionId && sectionMap.has(lesson.sectionId.toString())) {
//           sectionMap.get(lesson.sectionId.toString()).lessons.push(lessonObj);
//         } else {
//           if (!sectionMap.has('direct')) {
//             sectionMap.set('direct', {
//               _id: 'direct',
//               title: 'Course Content',
//               lessons: []
//             });
//           }
//           sectionMap.get('direct').lessons.push(lessonObj);
//         }
//       });
  
//       let progress = null;
//       if (userId) {
//         progress = await Progress.findOne({ userId, courseId });
//         if (!progress) {
//           progress = await Progress.create({
//             userId,
//             courseId,
//             completedLessons: [],
//             completionPercentage: 0
//           });
//         }
//       }
  
//       const result = {
//         ...course.toObject(),
//         sections: Array.from(sectionMap.values()),
//         progress: progress ? {
//           completedLessons: progress.completedLessons,
//           completionPercentage: progress.completionPercentage,
//           lastAccessedLesson: progress.lastAccessedLesson
//         } : null
//       };
  
//       res.status(200).json(result);
//     } catch (error) {
//       console.error('Error fetching course details:', error);
//       next(error);
//     }
//   };
  



// Get specific course with sections, lessons and progress
export const getCourseDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: 'Invalid course ID' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    const sections = await Section.find({ courseId }).sort({ order: 1 });
    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });

    // Organize lessons under their respective sections
    const sectionMap = new Map<string, any>();
    sections.forEach(section => {
      sectionMap.set(section._id.toString(), {
        ...section.toObject(),
        lessons: []
      });
    });

    lessons.forEach(lesson => {
      const lessonObj = lesson.toObject();
      if (lesson.sectionId && sectionMap.has(lesson.sectionId.toString())) {
        sectionMap.get(lesson.sectionId.toString()).lessons.push(lessonObj);
      } else {
        if (!sectionMap.has('direct')) {
          sectionMap.set('direct', {
            _id: 'direct',
            title: 'Course Content',
            lessons: []
          });
        }
        sectionMap.get('direct').lessons.push(lessonObj);
      }
    });

    let progressData = null;

    if (userId) {
      const progress = await Progress.findOne({ userId, courseId });

      const completedLessons = progress?.completedLessons || [];
      const totalLessons = lessons.length;

      const completionPercentage = totalLessons > 0
        ? Math.round((completedLessons.length / totalLessons) * 100)
        : 0;

      progressData = {
        completedLessons,
        lastAccessedLesson: progress?.lastAccessedLesson || null,
        completionPercentage
      };
    }

    const result = {
      ...course.toObject(),
      sections: Array.from(sectionMap.values()),
      progress: progressData
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching course details:', error);
    next(error);
  }
};





    