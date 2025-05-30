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

//       // Fetch sections and lessons
//       const sections = await Section.find({ courseId: { $in: courseIds } });
//       const sectionIds = sections.map(s => s._id);
//       const lessons = await Lesson.find({ courseId: { $in: courseIds } });

//       // Group lessons by course
//       const courseLessonMap = new Map<string, string[]>();

// lessons.forEach(lesson => {
//   const cId = lesson.courseId.toString();
//   if (!courseLessonMap.has(cId)) {
//     courseLessonMap.set(cId, []);
//   }
//   courseLessonMap.get(cId)!.push(lesson._id.toString());
// });

//       // Get user progress for all courses
//       const progresses = await Progress.find({
//         userId,
//         courseId: { $in: courseIds }
//       });

//       const progressMap = new Map<string, any>();
//       progresses.forEach(progress => {
//         progressMap.set(progress.courseId.toString(), progress);
//       });

//       // Map over courses and compute progress
//       const coursesWithProgress = courses.map(course => {
//         const courseObj = course.toObject();
//         const courseId = course._id.toString();
//         const allLessonIds = courseLessonMap.get(courseId) || [];
//         const progress = progressMap.get(courseId);
//         const completedLessonIds = progress?.completedLessons.map((id: any) => id.toString()) || [];

//         const completedCount = allLessonIds.filter(id => completedLessonIds.includes(id)).length;
//         const totalLessons = allLessonIds.length;

//         const completionPercentage = totalLessons > 0
//           ? Math.round((completedCount / totalLessons) * 100)
//           : 0;

//         return {
//           ...courseObj,
//           progress: {
//             completionPercentage
//           }
//         };
//       });

//       res.status(200).json(coursesWithProgress);
//       return;
//     }

//     // No user: return courses without progress
//     res.status(200).json(courses);
//   } catch (error) {
//     console.error('Error fetching courses:', error);
//     next(error);
//   }
// };


  



// // Get specific course with sections, lessons and progress
// export const getCourseDetails = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { courseId } = req.params;
//     const userId = req.user?._id;

//     if (!mongoose.Types.ObjectId.isValid(courseId)) {
//       res.status(400).json({ message: 'Invalid course ID' });
//       return;
//     }

//     const course = await Course.findById(courseId);
//     if (!course) {
//       res.status(404).json({ message: 'Course not found' });
//       return;
//     }

//     const sections = await Section.find({ courseId }).sort({ order: 1 });
//     const lessons = await Lesson.find({ courseId }).sort({ order: 1 });

//     // Organize lessons under their respective sections
//     const sectionMap = new Map<string, any>();
//     sections.forEach(section => {
//       sectionMap.set(section._id.toString(), {
//         ...section.toObject(),
//         lessons: []
//       });
//     });

//     lessons.forEach(lesson => {
//       const lessonObj = lesson.toObject();
//       if (lesson.sectionId && sectionMap.has(lesson.sectionId.toString())) {
//         sectionMap.get(lesson.sectionId.toString()).lessons.push(lessonObj);
//       } else {
//         if (!sectionMap.has('direct')) {
//           sectionMap.set('direct', {
//             _id: 'direct',
//             title: 'Course Content',
//             lessons: []
//           });
//         }
//         sectionMap.get('direct').lessons.push(lessonObj);
//       }
//     });

//     let progressData = null;

//     if (userId) {
//       const progress = await Progress.findOne({ userId, courseId });

//       const completedLessons = progress?.completedLessons || [];
//       const totalLessons = lessons.length;

//       const completionPercentage = totalLessons > 0
//         ? Math.round((completedLessons.length / totalLessons) * 100)
//         : 0;

//       progressData = {
//         completedLessons,
//         lastAccessedLesson: progress?.lastAccessedLesson || null,
//         completionPercentage
//       };
//     }

//     const result = {
//       ...course.toObject(),
//       sections: Array.from(sectionMap.values()),
//       progress: progressData
//     };

//     res.status(200).json(result);
//   } catch (error) {
//     console.error('Error fetching course details:', error);
//     next(error);
//   }
// };





    

// Updates to getAllCourses function

export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    
    // If no user is logged in, just return the courses without progress
    if (!userId) {
      const courses = await Course.find().sort({ order: 1 });
      res.status(200).json(courses);
      return;
    }

    // For logged-in users, use aggregation to get courses with progress in a single query
    const coursesWithProgress = await Course.aggregate([
      { $sort: { order: 1 } },
      {
        // Left join with progress to get completion data
        $lookup: {
          from: 'progresses',
          let: { courseId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$courseId', '$$courseId'] },
                    { $eq: ['$userId', new mongoose.Types.ObjectId(userId.toString())] }
                  ]
                } 
              }
            },
            { $project: { completedLessons: 1, _id: 0 } }
          ],
          as: 'progressData'
        }
      },
      {
        // Format the result
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          coverImage: 1,
          order: 1,
          totalLessons: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: 1,
          progress: {
            completionPercentage: {
              $cond: [
                { $gt: ['$totalLessons', 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        { $size: { $ifNull: [{ $arrayElemAt: ['$progressData.completedLessons', 0] }, []] } },
                        '$totalLessons'
                      ]
                    },
                    100
                  ]
                },
                0
              ]
            }
          }
        }
      },
      // Round the completion percentage
      {
        $addFields: {
          'progress.completionPercentage': { $round: ['$progress.completionPercentage', 0] }
        }
      }
    ]);

    res.status(200).json(coursesWithProgress);
  } catch (error) {
    console.error('Error fetching courses:', error);
    next(error);
  }
};













// // Updates to getCourseDetails function

// export const getCourseDetails = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { courseId } = req.params;
//     const userId = req.user?._id;

//     if (!mongoose.Types.ObjectId.isValid(courseId)) {
//       res.status(400).json({ message: 'Invalid course ID' });
//       return;
//     }

//     // First fetch the course
//     const course = await Course.findById(courseId);
//     if (!course) {
//       res.status(404).json({ message: 'Course not found' });
//       return;
//     }

//     // Use a parallel approach to fetch sections and lessons at the same time
//     const [sections, lessons, progress] = await Promise.all([
//       Section.find({ courseId }).sort({ order: 1 }),
//       Lesson.find({ courseId }).sort({ order: 1 }),
//       userId ? Progress.findOne({ userId, courseId }) : null
//     ]);

//     // Calculate progress metrics
//     let progressData = null;
//     if (userId) {
//       const completedLessons = progress?.completedLessons || [];
//       const totalLessons = course.totalLessons;
      
//       const completionPercentage = totalLessons > 0
//         ? Math.round((completedLessons.length / totalLessons) * 100)
//         : 0;

//       progressData = {
//         completedLessons,
//         lastAccessedLesson: progress?.lastAccessedLesson || null,
//         completionPercentage
//       };
//     }

//     // The rest of the function remains the same...
//     // Organize lessons by section using a Map
//     const sectionsWithLessons = sections.map(section => ({
//       ...section.toObject(),
//       lessons: []
//     }));
 

    
//     const sectionMap = new Map();
//     sectionsWithLessons.forEach(section => {
//       sectionMap.set(section._id.toString(), section);
//     });
    
//     const directLessons:any = [];
    
//     lessons.forEach(lesson => {
//       const lessonObj = lesson.toObject();
//       if (lesson.sectionId && sectionMap.has(lesson.sectionId.toString())) {
//         sectionMap.get(lesson.sectionId.toString()).lessons.push(lessonObj);
//       } else {
//         directLessons.push(lessonObj);
//       }
//     });
    
//     if (directLessons.length > 0) {
//       sectionsWithLessons.push({
//         _id: 'direct',
//         title: 'Course Content',
//         lessons: directLessons
//       });
//     }

//     const result = {
//       ...course.toObject(),
//       sections: sectionsWithLessons,
//       progress: progressData
//     };

//     res.status(200).json(result);
//   } catch (error) {
//     console.error('Error fetching course details:', error);
//     next(error);
//   }
// };




// Complete fixed getCourseDetails function with proper typing

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

    // First fetch the course
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Use a parallel approach to fetch sections and lessons at the same time
    const [sections, lessons, progress] = await Promise.all([
      Section.find({ courseId }).sort({ order: 1 }),
      Lesson.find({ courseId }).sort({ order: 1 }),
      userId ? Progress.findOne({ userId, courseId }) : null
    ]);

    // Calculate progress metrics
    let progressData = null;
    if (userId) {
      const completedLessons = progress?.completedLessons || [];
      const totalLessons = course.totalLessons;
      
      const completionPercentage = totalLessons > 0
        ? Math.round((completedLessons.length / totalLessons) * 100)
        : 0;

      progressData = {
        completedLessons,
        lastAccessedLesson: progress?.lastAccessedLesson || null,
        completionPercentage
      };
    }

    // Define a flexible type for sections with lessons
    type SectionWithLessons = {
      _id: mongoose.Types.ObjectId | string;
      title: string;
      courseId?: mongoose.Types.ObjectId;
      order?: number;
      isPublished?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
      lessons: any[];
      [key: string]: any;
    };

    // Organize lessons by section using a Map
    const sectionsWithLessons: SectionWithLessons[] = sections.map(section => ({
      ...section.toObject(),
      lessons: []
    }));
    
    const sectionMap = new Map();
    sectionsWithLessons.forEach(section => {
      sectionMap.set(section._id.toString(), section);
    });
    
    const directLessons: any = [];
    
    lessons.forEach(lesson => {
      const lessonObj = lesson.toObject();
      if (lesson.sectionId && sectionMap.has(lesson.sectionId.toString())) {
        sectionMap.get(lesson.sectionId.toString()).lessons.push(lessonObj);
      } else {
        directLessons.push(lessonObj);
      }
    });
    
    // Fixed: Now using proper typing that allows string _id
    if (directLessons.length > 0) {
      sectionsWithLessons.push({
        _id: 'direct',
        title: 'Course Content',
        lessons: directLessons
      });
    }

    const result = {
      ...course.toObject(),
      sections: sectionsWithLessons,
      progress: progressData
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching course details:', error);
    next(error);
  }
};