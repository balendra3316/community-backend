

import Course from '../models/Course.model';
import Section from '../models/Section.model';
import Lesson from '../models/Lesson.model';
import Progress from '../models/Progress.model';
import mongoose from 'mongoose';

import { Request, Response, NextFunction } from 'express';


    



export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    

    if (!userId) {
      const courses = await Course.find().sort({ order: 1 });
      res.status(200).json(courses);
      return;
    }


    const coursesWithProgress = await Course.aggregate([
      { $sort: { order: 1 } },
      {

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

      {
        $addFields: {
          'progress.completionPercentage': { $round: ['$progress.completionPercentage', 0] }
        }
      }
    ]);

    res.status(200).json(coursesWithProgress);
  } catch (error) {
    next(error);
  }
};












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


    const [sections, lessons, progress] = await Promise.all([
      Section.find({ courseId }).sort({ order: 1 }),
      Lesson.find({ courseId }).sort({ order: 1 }),
      userId ? Progress.findOne({ userId, courseId }) : null
    ]);


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
    next(error);
  }
};