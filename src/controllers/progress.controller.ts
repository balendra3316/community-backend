

 import { Request, Response, NextFunction } from 'express';
import Progress from '../models/Progress.model';
import Course from '../models/Course.model';
import mongoose from 'mongoose';
import User from '../models/User.model';
import PointsHistory from '../models/PointsHistory.model';
import { updateUserPoints } from './post.controller';

export const toggleLessonCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lessonId, courseId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (
      !mongoose.Types.ObjectId.isValid(lessonId) ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      res.status(400).json({ message: 'Invalid lesson or course ID' });
      return;
    }

    const lessonObjectId = new mongoose.Types.ObjectId(lessonId);
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    let progress = await Progress.findOne({ userId, courseId: courseObjectId });
    if (!progress) {
      progress = new Progress({
        userId,
        courseId: courseObjectId,
        completedLessons: [],
        completionPercentage: 0,
        pointsAwarded: false
      });
    }

    let isCompleted = false;

    const alreadyCompleted = progress.completedLessons.some(id =>
      id.equals(lessonObjectId)
    );

    if (alreadyCompleted) {
      // Remove lesson from completed lessons
      progress.completedLessons = progress.completedLessons.filter(
        id => !id.equals(lessonObjectId)
      );
    } else {
      // Add lesson to completed lessons
      progress.completedLessons.push(lessonObjectId);
      isCompleted = true;
    }

    // Update completion percentage using Course model's totalLessons
    const course = await Course.findById(courseObjectId).select('totalLessons');
    const totalLessons = course?.totalLessons || 0;

    progress.completionPercentage =
      totalLessons > 0
        ? Math.round((progress.completedLessons.length / totalLessons) * 100)
        : 0;

    await progress.save();

    // Send immediate response
    res.status(200).json({
      isCompleted,
      success: true
    });

    // Handle points awarding in background using setImmediate (non-blocking)
    if (isCompleted && progress.completionPercentage === 100 && !progress.pointsAwarded) {
      setImmediate(async () => {
        try {
          await updateUserPoints(userId.toString(), 10);
          // Update pointsAwarded flag
          await Progress.findOneAndUpdate(
            { userId, courseId: courseObjectId },
            { pointsAwarded: true }
          );
        } catch (error) {
          console.error('Background points update failed:', error);
        }
      });
    }

  } catch (error) {
    console.error('Error toggling lesson completion:', error);
    next(error);
  }
};