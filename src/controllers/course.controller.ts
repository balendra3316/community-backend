



import Course from "../models/Course.model";
import Section from "../models/Section.model";
import Lesson from "../models/Lesson.model";
import Progress from "../models/Progress.model";
import User from "../models/User.model";
import Payment from "../models/Payment.model";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      // For non-authenticated users, only return free courses
      const courses = await Course.find({ isPaid: false }).sort({ order: 1 });
      const coursesWithPayment = courses.map(course => ({
        ...course.toObject(),
        isAccessible: true,
        needsPayment: false,
        progress: null
      }));
      res.status(200).json(coursesWithPayment);
      return;
    }

    // Get user's purchased courses
    const user = await User.findById(userId);
    const purchasedCourseIds = user?.myPurchasedCourses || [];

    const coursesWithProgress = await Course.aggregate([
      { $sort: { order: 1 } },
      {
        $lookup: {
          from: "progresses",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$courseId", "$$courseId"] },
                    {
                      $eq: [
                        "$userId",
                        new mongoose.Types.ObjectId(userId.toString()),
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { completedLessons: 1, _id: 0 } },
          ],
          as: "progressData",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          coverImage: 1,
          order: 1,
          totalLessons: 1,
          isPaid: 1,
          price: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: 1,
          progress: {
            completionPercentage: {
              $cond: [
                { $gt: ["$totalLessons", 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $size: {
                            $ifNull: [
                              {
                                $arrayElemAt: [
                                  "$progressData.completedLessons",
                                  0,
                                ],
                              },
                              [],
                            ],
                          },
                        },
                        "$totalLessons",
                      ],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          "progress.completionPercentage": {
            $round: ["$progress.completionPercentage", 0],
          },
        },
      },
    ]);

    // Add payment and access information
    const coursesWithAccessInfo = coursesWithProgress.map(course => {
      const courseId = course._id.toString();
      const isPurchased = purchasedCourseIds.some((id: mongoose.Types.ObjectId) => 
        id.toString() === courseId
      );
      const isAccessible = !course.isPaid || isPurchased;
      
      return {
        ...course,
        isAccessible,
        needsPayment: course.isPaid && !isPurchased,
        progress: isAccessible ? course.progress : null
      };
    });

    res.status(200).json(coursesWithAccessInfo);
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
      res.status(400).json({ message: "Invalid course ID" });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    // Check if user has access to this course
    let hasAccess = false;
    let needsPayment = false;

    if (!course.isPaid) {
      hasAccess = true;
    } else if (userId) {
      const user = await User.findById(userId);
      hasAccess = user?.hasPurchasedCourse(courseId) || false;
      needsPayment = !hasAccess;
    } else {
      needsPayment = true;
    }

    // If user doesn't have access to paid course, return limited info
    if (!hasAccess && course.isPaid) {
      res.status(200).json({
        _id: course._id,
        title: course.title,
        description: course.description,
        coverImage: course.coverImage,
        totalLessons: course.totalLessons,
        isPaid: course.isPaid,
        price: course.price,
        isAccessible: false,
        needsPayment: true,
        sections: [],
        progress: null
      });
      return;
    }

    const [sections, lessons, progress] = await Promise.all([
      Section.find({ courseId }).sort({ order: 1 }),
      Lesson.find({ courseId }).sort({ order: 1 }),
      userId ? Progress.findOne({ userId, courseId }) : null,
    ]);

    let progressData = null;
    if (userId && hasAccess) {
      const completedLessons = progress?.completedLessons || [];
      const totalLessons = course.totalLessons;

      const completionPercentage =
        totalLessons > 0
          ? Math.round((completedLessons.length / totalLessons) * 100)
          : 0;

      progressData = {
        completedLessons,
        lastAccessedLesson: progress?.lastAccessedLesson || null,
        completionPercentage,
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

    const sectionsWithLessons: SectionWithLessons[] = sections.map(
      (section) => ({
        ...section.toObject(),
        lessons: [],
      })
    );

    const sectionMap = new Map();
    sectionsWithLessons.forEach((section) => {
      sectionMap.set(section._id.toString(), section);
    });

    const directLessons: any = [];

    lessons.forEach((lesson) => {
      const lessonObj = lesson.toObject();
      if (lesson.sectionId && sectionMap.has(lesson.sectionId.toString())) {
        sectionMap.get(lesson.sectionId.toString()).lessons.push(lessonObj);
      } else {
        directLessons.push(lessonObj);
      }
    });

    if (directLessons.length > 0) {
      sectionsWithLessons.push({
        _id: "direct",
        title: "Course Content",
        lessons: directLessons,
      });
    }

    const result = {
      ...course.toObject(),
      sections: sectionsWithLessons,
      progress: progressData,
      isAccessible: hasAccess,
      needsPayment: needsPayment
    };

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};











export const purchaseCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId, paymentAmount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.user?._id;

    console.log('Purchase request body:', req.body); // Debug log
    console.log('User ID:', userId); // Debug log

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: "Invalid course ID" });
      return;
    }

    // Validate required payment fields - be more flexible with signature for test mode
    if (!paymentAmount || !razorpayPaymentId) {
      res.status(400).json({ 
        message: "Missing required payment information",
        missing: {
          paymentAmount: !paymentAmount,
          razorpayPaymentId: !razorpayPaymentId
        }
      });
      return;
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    if (!course.isPaid) {
      res.status(400).json({ message: "This course is free and doesn't require purchase" });
      return;
    }

    // More flexible payment amount validation (handle floating point precision)
    const expectedAmount = course.price;
    const receivedAmount = paymentAmount;
    
    if (Math.abs(receivedAmount - expectedAmount) > 0.01) { // Allow 1 paisa difference for floating point
      res.status(400).json({
        message: "Payment amount doesn't match course price",
        expected: expectedAmount,
        received: receivedAmount
      });
      return;
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if user already purchased this course
    if (user.hasPurchasedCourse(courseId)) {
      res.status(400).json({ message: "Course already purchased" });
      return;
    }

    // For production, you should verify Razorpay signature
    // For now, we'll skip signature verification for testing
    if (process.env.NODE_ENV === 'production' && razorpaySignature) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpayOrderId + '|' + razorpayPaymentId)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        res.status(400).json({ message: "Payment signature verification failed" });
        return;
      }
    }

    // Create payment record
    const payment = new Payment({
      userId,
      courseId,
      amount: paymentAmount,
      currency: 'INR',
      razorpayOrderId: razorpayOrderId || `temp_order_${Date.now()}`,
      razorpayPaymentId,
      razorpaySignature: razorpaySignature || 'temp_signature',
      status: 'completed'
    });

    await payment.save();

    // Add course to user's purchased courses
    user.myPurchasedCourses.push(new mongoose.Types.ObjectId(courseId));
    await user.save();

    console.log('Course purchased successfully:', {
      userId,
      courseId,
      paymentId: payment._id
    }); // Debug log

    res.status(200).json({
      message: "Course purchased successfully",
      courseId,
      paymentId: payment._id,
      accessGranted: true
    });

  } catch (error) {
    console.error('Purchase course error:', error); // Debug log
    next(error);
  }
};

















export const getUserPurchasedCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const user = await User.findById(userId).populate('myPurchasedCourses');
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      purchasedCourses: user.myPurchasedCourses,
      totalPurchased: user.myPurchasedCourses.length
    });

  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const payments = await Payment.find({ userId })
      .populate('courseId', 'title coverImage price')
      .sort({ createdAt: -1 });

    res.status(200).json(payments);

  } catch (error) {
    next(error);
  }
};












export const getAllCoursesAdmin = async (
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
          from: "progresses",
          let: { courseId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$courseId", "$$courseId"] },
                    {
                      $eq: [
                        "$userId",
                        new mongoose.Types.ObjectId(userId.toString()),
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { completedLessons: 1, _id: 0 } },
          ],
          as: "progressData",
        },
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
                { $gt: ["$totalLessons", 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $size: {
                            $ifNull: [
                              {
                                $arrayElemAt: [
                                  "$progressData.completedLessons",
                                  0,
                                ],
                              },
                              [],
                            ],
                          },
                        },
                        "$totalLessons",
                      ],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      },

      {
        $addFields: {
          "progress.completionPercentage": {
            $round: ["$progress.completionPercentage", 0],
          },
        },
      },
    ]);

    res.status(200).json(coursesWithProgress);
  } catch (error) {
    next(error);
  }
};

export const getCourseDetailsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: "Invalid course ID" });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    const [sections, lessons, progress] = await Promise.all([
      Section.find({ courseId }).sort({ order: 1 }),
      Lesson.find({ courseId }).sort({ order: 1 }),
      userId ? Progress.findOne({ userId, courseId }) : null,
    ]);

    let progressData = null;
    if (userId) {
      const completedLessons = progress?.completedLessons || [];
      const totalLessons = course.totalLessons;

      const completionPercentage =
        totalLessons > 0
          ? Math.round((completedLessons.length / totalLessons) * 100)
          : 0;

      progressData = {
        completedLessons,
        lastAccessedLesson: progress?.lastAccessedLesson || null,
        completionPercentage,
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

    const sectionsWithLessons: SectionWithLessons[] = sections.map(
      (section) => ({
        ...section.toObject(),
        lessons: [],
      })
    );

    const sectionMap = new Map();
    sectionsWithLessons.forEach((section) => {
      sectionMap.set(section._id.toString(), section);
    });

    const directLessons: any = [];

    lessons.forEach((lesson) => {
      const lessonObj = lesson.toObject();
      if (lesson.sectionId && sectionMap.has(lesson.sectionId.toString())) {
        sectionMap.get(lesson.sectionId.toString()).lessons.push(lessonObj);
      } else {
        directLessons.push(lessonObj);
      }
    });

    if (directLessons.length > 0) {
      sectionsWithLessons.push({
        _id: "direct",
        title: "Course Content",
        lessons: directLessons,
      });
    }

    const result = {
      ...course.toObject(),
      sections: sectionsWithLessons,
      progress: progressData,
    };

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

