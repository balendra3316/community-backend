



import Course from "../models/Course.model";
import Section from "../models/Section.model";
import Lesson from "../models/Lesson.model";
import Progress from "../models/Progress.model";
import User from "../models/User.model";
import Payment from "../models/Payment.model";
import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";

// export const getAllCourses = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const userId = req.user?._id;
    


// Course.updateMany(
//    { isPublished: { $exists: false } },
//    { $set: { isPublished: true } }
// )



//     if (!userId) {

//       const courses = await Course.find({ 
//         isPaid: false, 
//         isPublished: true 
//       }).sort({ order: 1 });
//       const coursesWithPayment = courses.map(course => ({
//         ...course.toObject(),
//         isAccessible: true,
//         needsPayment: false,
//         progress: null
//       }));
//       res.status(200).json(coursesWithPayment);
//       return;
//     }


//     const user = await User.findById(userId);
//     const purchasedCourseIds = user?.myPurchasedCourses || [];

//     const coursesWithProgress = await Course.aggregate([
//       { 
//         $match: { isPublished: true } 
//       },
//       { $sort: { order: 1 } },
//       {
//         $lookup: {
//           from: "progresses",
//           let: { courseId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$courseId", "$$courseId"] },
//                     {
//                       $eq: [
//                         "$userId",
//                         new mongoose.Types.ObjectId(userId.toString()),
//                       ],
//                     },
//                   ],
//                 },
//               },
//             },
//             { $project: { completedLessons: 1, _id: 0 } },
//           ],
//           as: "progressData",
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           title: 1,
//           description: 1,
//           coverImage: 1,
//           order: 1,
//           totalLessons: 1,
//           isPaid: 1,
//           price: 1,
//           createdAt: 1,
//           updatedAt: 1,
//           createdBy: 1,
//           progress: {
//             completionPercentage: {
//               $cond: [
//                 { $gt: ["$totalLessons", 0] },
//                 {
//                   $multiply: [
//                     {
//                       $divide: [
//                         {
//                           $size: {
//                             $ifNull: [
//                               {
//                                 $arrayElemAt: [
//                                   "$progressData.completedLessons",
//                                   0,
//                                 ],
//                               },
//                               [],
//                             ],
//                           },
//                         },
//                         "$totalLessons",
//                       ],
//                     },
//                     100,
//                   ],
//                 },
//                 0,
//               ],
//             },
//           },
//         },
//       },
//       {
//         $addFields: {
//           "progress.completionPercentage": {
//             $round: ["$progress.completionPercentage", 0],
//           },
//         },
//       },
//     ]);


//     const coursesWithAccessInfo = coursesWithProgress.map(course => {
//       const courseId = course._id.toString();
//       const isPurchased = purchasedCourseIds.some((id: mongoose.Types.ObjectId) => 
//         id.toString() === courseId
//       );
//       const isAccessible = !course.isPaid || isPurchased;
      
//       return {
//         ...course,
//         isAccessible,
//         needsPayment: course.isPaid && !isPurchased,
//         progress: isAccessible ? course.progress : null
//       };
//     });

//     res.status(200).json(coursesWithAccessInfo);
//   } catch (error) {
//     next(error);
//   }
// };


interface AggregatedCourse {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    coverImage: string;
    isPaid: boolean;
    price: number;
    totalLessons: number;
    progress: { completionPercentage: number } | null;
}



export const getAllCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let purchasedCourseIds: mongoose.Types.ObjectId[] = [];
    if (userId) {
      // Fetch only the necessary field from the user document
      const user = await User.findById(userId).select('myPurchasedCourses').lean();
      purchasedCourseIds = user?.myPurchasedCourses || [];
    }

    // Use an aggregation pipeline with $facet for efficient pagination and total counting
    const aggregationResult = await Course.aggregate([
      { $match: { isPublished: true } },
      { $sort: { order: 1 } },
      {
        $facet: {
          // Pipeline for fetching the paginated data
          paginatedResults: [
            { $skip: skip },
            { $limit: limit },
            {
              // Join with progress collection only for logged-in users
              $lookup: {
                from: "progresses",
                let: { courseId: "$_id" },
                pipeline: userId ? [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$courseId", "$$courseId"] },
                          { $eq: ["$userId", userId] },
                          // { $eq: ["$userId", new mongoose.Types.ObjectId(userId.toString())] },
                        ],
                      },
                    },
                  },
                  { $project: { completionPercentage: 1, _id: 0 } },
                ] : [], // Empty pipeline if no user
                as: "progressData",
              },
            },
            // Project only the fields needed by the frontend
            {
              $project: {
                title: 1,
                description: 1,
                coverImage: 1,
                isPaid: 1,
                price: 1,
                totalLessons: 1,
                progress: {
                  $ifNull: [{ $first: "$progressData" }, null]
                }
              }
            }
          ],
          // Pipeline for counting the total number of documents
          totalCount: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    const coursesData = aggregationResult[0].paginatedResults;
    const totalCourses = aggregationResult[0].totalCount[0]?.count || 0;

    // Add access information based on user's purchase history
    const coursesWithAccessInfo = coursesData.map((course: AggregatedCourse) => {
      const isPurchased = purchasedCourseIds.some(id => id.equals(course._id));
      const isAccessible = !course.isPaid || isPurchased;
      return {
        ...course,
        isAccessible,
        needsPayment: course.isPaid && !isPurchased,
        progress: isAccessible ? course.progress : null, // Show progress only if accessible
      };
    });

    res.status(200).json({
      courses: coursesWithAccessInfo,
      totalPages: Math.ceil(totalCourses / limit),
      currentPage: page,
    });

  } catch (error) {
    next(error);
  }
};



export const createCourseOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId)
    ]);

    if (!course || !course.isPaid) {
      res.status(404).json({ message: "Paid course not found." });
      return;
    }
   
  if (!course.price || course.price <= 0) {
      res.status(400).json({ message: "Course price is not valid for purchase." });
      return;
    }

    if (user?.hasPurchasedCourse(courseId)) {
      res.status(400).json({ message: "You have already purchased this course." });
      return;
    }
   console.log("start")
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
 console.log(razorpayInstance)
 console.log("courseprice", course.price)
    const options = {
      amount: course.price * 100, 
      currency: 'INR',
      receipt: `rcpt_order_${Date.now()}`,
      notes: {
        courseId: courseId.toString(),
        userId: userId.toString(),
      }
    };

    const order = await razorpayInstance.orders.create(options);
    console.log("order", order)
    res.status(200).json(order);

  } catch (error:any) {
    // console.error("----------- RAZORPAY ORDER CREATION FAILED -----------");
    
    // // Razorpay errors often have a detailed `error` object inside.
    // if (error.error) {
    //   console.error("Detailed Razorpay Error:", error.error);
    // } else {
    //   // If it's a different kind of error, log the whole thing.
    //   console.error("Full Error Object:", error);
    // }
    // console.error("----------------------------------------------------");
    
    // Send a more informative error message to the frontend
    res.status(500).json({ 
      message: "Failed to create Razorpay order.",
      // Pass the specific reason if it exists
      reason: error.error?.description || "An internal server error occurred."
    });
  }
};



export const verifyCoursePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!courseId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ message: "Payment verification failed: Missing details." });
      return;
    }

    // The core security step: recreate the signature on the server and compare.
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ message: "Payment verification failed: Invalid signature." });
      return;
    }

    // If signature is valid, proceed with granting access
    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId)
    ]);

    if (!user || !course) {
      res.status(404).json({ message: "User or Course not found." });
      return;
    }

    if (user.hasPurchasedCourse(courseId)) {
      // This is a safeguard in case of duplicate requests
      res.status(200).json({ message: "Course access already granted." });
      return;
    }

    // Record the successful payment
    const payment = new Payment({
      userId,
      courseId,
      paymentType: 'course',
      amount: course.price,
      currency: 'INR',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'completed'
    });

    
    //user.myPurchasedCourses.push(new mongoose.Types.ObjectId(courseId));
        user.myPurchasedCourses.push(courseId);

    // Save both documents in parallel
    await Promise.all([payment.save(), user.save()]);

    res.status(200).json({
      message: "Course purchased successfully!",
      accessGranted: true
    });

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










// // not anymore use this function
// export const purchaseCourse = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { courseId, paymentAmount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
//     const userId = req.user?._id;




//     if (!userId) {
//       res.status(401).json({ message: "Authentication required" });
//       return;
//     }

//     if (!mongoose.Types.ObjectId.isValid(courseId)) {
//       res.status(400).json({ message: "Invalid course ID" });
//       return;
//     }


//     if (!paymentAmount || !razorpayPaymentId) {
//       res.status(400).json({ 
//         message: "Missing required payment information",
//         missing: {
//           paymentAmount: !paymentAmount,
//           razorpayPaymentId: !razorpayPaymentId
//         }
//       });
//       return;
//     }


//     const course = await Course.findById(courseId);
//     if (!course) {
//       res.status(404).json({ message: "Course not found" });
//       return;
//     }

//     if (!course.isPaid) {
//       res.status(400).json({ message: "This course is free and doesn't require purchase" });
//       return;
//     }


//     const expectedAmount = course.price;
//     const receivedAmount = paymentAmount;
    
//     if (Math.abs(receivedAmount - expectedAmount) > 0.01) { // Allow 1 paisa difference for floating point
//       res.status(400).json({
//         message: "Payment amount doesn't match course price",
//         expected: expectedAmount,
//         received: receivedAmount
//       });
//       return;
//     }


//     const user = await User.findById(userId);
//     if (!user) {
//       res.status(404).json({ message: "User not found" });
//       return;
//     }


//     if (user.hasPurchasedCourse(courseId)) {
//       res.status(400).json({ message: "Course already purchased" });
//       return;
//     }



//     if (process.env.NODE_ENV === 'production' && razorpaySignature) {
//       const crypto = require('crypto');
//       const expectedSignature = crypto
//         .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//         .update(razorpayOrderId + '|' + razorpayPaymentId)
//         .digest('hex');

//       if (expectedSignature !== razorpaySignature) {
//         res.status(400).json({ message: "Payment signature verification failed" });
//         return;
//       }
//     }


//     const payment = new Payment({
//       userId,
//       courseId,
//       paymentType: 'course',
//       amount: paymentAmount,
//       currency: 'INR',
//       razorpayOrderId: razorpayOrderId || `temp_order_${Date.now()}`,
//       razorpayPaymentId,
//       razorpaySignature: razorpaySignature || 'temp_signature',
//       status: 'completed'
//     });

//     await payment.save();


//     //user.myPurchasedCourses.push(new mongoose.Types.ObjectId(courseId));
//     user.myPurchasedCourses.push(courseId);
//     await user.save();

  

//     res.status(200).json({
//       message: "Course purchased successfully",
//       courseId,
//       paymentId: payment._id,
//       accessGranted: true
//     });

//   } catch (error) {
    
//     next(error);
//   }
// };

















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




/**
 * @desc    Get public-facing course information
 * @route   GET /api/courses/public/:courseId
 * @access  Public
 */
export const getPublicCourseInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: "Invalid course ID" });
      return;
    }

    const course = await Course.findById(courseId).select(
      "title description coverImage isPaid price isPublished"
    );

    if (!course || !course.isPublished) {
      res.status(404).json({ message: "Course not found or not available" });
      return;
    }

    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get course details and user's purchase status
 * @route   GET /api/courses/access-details/:courseId
 * @access  Protected
 */
export const getCourseAccessDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    console.log(courseId, "user id", userId)

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: "Invalid course ID" });
      return;
    }

    const course = await Course.findById(courseId).select(
      "title description coverImage isPaid price isPublished"
    );
   //console.log(course)
    if (!course || !course.isPublished) {
      res.status(404).json({ message: "Course not found or not available" });
      return;
    }
    
    // This assumes req.user is populated by your 'protect' middleware
    const user = await User.findById(userId);
    const isPurchased = user?.hasPurchasedCourse(courseId) || false;

    res.status(200).json({
      ...course.toObject(),
      isPurchased,
    });
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
                    // {
                    //   $eq: [
                    //     "$userId",
                    //     new mongoose.Types.ObjectId(userId.toString()),
                    //   ],
                    // },
                    { $eq: ["$userId", userId] },
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

