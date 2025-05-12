import { Request, Response, NextFunction } from 'express';
import Lesson from '../models/Lesson.model';
import Progress from '../models/Progress.model';
import mongoose from 'mongoose';

export const getLessonContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      res.status(400).json({ message: 'Invalid lesson ID' });
      return;
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    // If user is authenticated
    if (userId) {
      await Progress.findOneAndUpdate(
        { userId, courseId: lesson.courseId },
        {
          lastAccessedLesson: lesson._id,
          $setOnInsert: { completedLessons: [], completionPercentage: 0 },
        },
        { upsert: true, new: true }
      );

      const progress = await Progress.findOne({
        userId,
        courseId: lesson.courseId,
        completedLessons: lessonId,
      });

      res.status(200).json({
        ...lesson.toObject(),
        isCompleted: !!progress,
      });
      return;
    }

    // If not authenticated, just return the lesson
    res.status(200).json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    next(error); // forward to Express error middleware
  }
};
