import { Request, Response, NextFunction } from 'express';
import Lesson from '../../models/Lesson.model';
import Course from '../../models/Course.model';
import Section from '../../models/Section.model';
import Progress from '../../models/Progress.model';
import mongoose from 'mongoose';
import cloudinary from '../../config/cloudinary';
import path from 'path';



export const createLessonInCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const {
      title, content, videoUrl, videoThumbnail, videoDuration,
      resources = [], images = [], order, isPublished
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: 'Invalid course ID' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    if (!title) {
      res.status(400).json({ message: 'Lesson title is required' });
      return;
    }

    // Handle order
    let lessonOrder = order;
    if (lessonOrder === undefined) {
      const highestOrder = await Lesson.findOne({ courseId, sectionId: null })
        .sort({ order: -1 })
        .select('order');
      lessonOrder = highestOrder ? highestOrder.order + 1 : 0;
    }

    // Process images - handle both URLs and file uploads
    const processedImages = [];
    const parsedImages = Array.isArray(images) ? images : JSON.parse(images || '[]');

    for (const img of parsedImages) {
      if (img.url) {
        // Direct URL case
        processedImages.push({
          url: img.url,
          caption: img.caption || '',
          altText: img.altText || ''
        });
      }
    }

    // Process uploaded image files
    if (req.files) {
      const imageFiles = (req.files as Express.Multer.File[]).filter(file => 
        file.fieldname.startsWith('imageFiles[')
      );

      for (const file of imageFiles) {
        // Extract index from fieldname (e.g., "imageFiles[0]" => 0)
        const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
        const metadata = parsedImages[index] || {};

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { folder: 'lesson-images' }
        );

        processedImages.push({
          url: result.secure_url,
          caption: metadata.caption || '',
          altText: metadata.altText || file.originalname
        });
      }
    }

    // Process resources - handle both URLs and file uploads
    const processedResources = [];
    const parsedResources = Array.isArray(resources) ? resources : JSON.parse(resources || '[]');

    for (const res of parsedResources) {
      if (res.fileUrl) {
        // Direct URL case
        processedResources.push({
          title: res.title || '',
          fileUrl: res.fileUrl,
          fileType: res.fileType || (res.fileUrl.includes('.pdf') ? 'pdf' : 'document')
        });
      }
    }

    // Process uploaded resource files
    if (req.files) {
      const resourceFiles = (req.files as Express.Multer.File[]).filter(file => 
        file.fieldname.startsWith('resourceFiles[')
      );

      for (const file of resourceFiles) {
        // Extract index from fieldname (e.g., "resourceFiles[0]" => 0)
        const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
        const metadata = parsedResources[index] || {};

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(
  `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
  {
    folder: 'lesson-resources',
    resource_type: 'raw',
    public_id: `lesson-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`, // keeps file name readable
    format: path.extname(file.originalname).substring(1) // this adds .pdf, .docx, etc.
  }
);


        // Determine file type
        let fileType = 'document';
        if (file.mimetype.includes('pdf')) fileType = 'pdf';
        else if (file.mimetype.includes('word')) fileType = 'doc';
        else if (file.mimetype.includes('excel')) fileType = 'xls';
        else if (file.mimetype.includes('powerpoint')) fileType = 'ppt';

        processedResources.push({
          title: metadata.title || file.originalname,
          fileUrl: result.secure_url,
          fileType: fileType
        });
      }
    }

    const newLesson = await Lesson.create({
      title,
      courseId,
      content: content || '',
      videoUrl,
      videoThumbnail,
      videoDuration,
      resources: processedResources,
      images: processedImages,
      order: lessonOrder,
      isPublished: isPublished ?? false
    });

    res.status(201).json(newLesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    next(error);
  }
};



export const createLessonInSection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sectionId } = req.params;
    const {
      title, content, videoUrl, videoThumbnail, videoDuration,
      resources = [], images = [], order, isPublished
    } = req.body;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      res.status(400).json({ message: 'Invalid section ID' });
      return;
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      res.status(404).json({ message: 'Section not found' });
      return;
    }

    if (!title) {
      res.status(400).json({ message: 'Lesson title is required' });
      return;
    }

    let lessonOrder = order;
    if (lessonOrder === undefined) {
      const highestOrder = await Lesson.findOne({ sectionId })
        .sort({ order: -1 })
        .select('order');
      lessonOrder = highestOrder ? highestOrder.order + 1 : 0;
    }

    // Process images - handle both URLs and file uploads
    const processedImages = [];
    const parsedImages = Array.isArray(images) ? images : JSON.parse(images || '[]');

    for (const img of parsedImages) {
      if (img.url) {
        processedImages.push({
          url: img.url,
          caption: img.caption || '',
          altText: img.altText || ''
        });
      }
    }

    // Process uploaded image files
    if (req.files) {
      const imageFiles = (req.files as Express.Multer.File[]).filter(file => 
        file.fieldname.startsWith('imageFiles[')
      );

      for (const file of imageFiles) {
        const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
        const metadata = parsedImages[index] || {};

        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { folder: 'lesson-images' }
        );

        processedImages.push({
          url: result.secure_url,
          caption: metadata.caption || '',
          altText: metadata.altText || file.originalname
        });
      }
    }

    // Process resources - handle both URLs and file uploads
    const processedResources = [];
    const parsedResources = Array.isArray(resources) ? resources : JSON.parse(resources || '[]');

    for (const res of parsedResources) {
      if (res.fileUrl) {
        processedResources.push({
          title: res.title || '',
          fileUrl: res.fileUrl,
          fileType: res.fileType || (res.fileUrl.includes('.pdf') ? 'pdf' : 'document')
        });
      }
    }

    // Process uploaded resource files
    if (req.files) {
      const resourceFiles = (req.files as Express.Multer.File[]).filter(file => 
        file.fieldname.startsWith('resourceFiles[')
      );

      for (const file of resourceFiles) {
        const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
        const metadata = parsedResources[index] || {};

        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { 
            folder: 'lesson-resources',
            resource_type: 'auto'
          }
        );

        let fileType = 'document';
        if (file.mimetype.includes('pdf')) fileType = 'pdf';
        else if (file.mimetype.includes('word')) fileType = 'doc';
        else if (file.mimetype.includes('excel')) fileType = 'xls';
        else if (file.mimetype.includes('powerpoint')) fileType = 'ppt';

        processedResources.push({
          title: metadata.title || file.originalname,
          fileUrl: result.secure_url,
          fileType: fileType
        });
      }
    }

    const newLesson = await Lesson.create({
      title,
      courseId: section.courseId,
      sectionId,
      content: content || '',
      videoUrl,
      videoThumbnail,
      videoDuration,
      resources: processedResources,
      images: processedImages,
      order: lessonOrder,
      isPublished: isPublished ?? false,
      createdBy: userId
    });

    res.status(201).json(newLesson);
  } catch (error) {
    console.error('Error creating lesson in section:', error);
    next(error);
  }
};


export const updateLesson = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lessonId } = req.params;
    const {
      title, content, videoUrl, videoThumbnail, videoDuration,
      resources, images, sectionId, order, isPublished
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      res.status(400).json({ message: 'Invalid lesson ID' });
      return;
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    // Handle section update if provided
    if (sectionId !== undefined) {
      if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
        const section = await Section.findById(sectionId);
        if (!section) {
          res.status(404).json({ message: 'Section not found' });
          return;
        }
        if (section.courseId.toString() !== lesson.courseId.toString()) {
          res.status(400).json({ message: 'Section must belong to the same course' });
          return;
        }
        lesson.sectionId = sectionId;
      } else if (sectionId === null) {
        lesson.sectionId = undefined;
      }
    }

    // Process images - handle both URLs and file uploads
    if (images !== undefined) {
      const processedImages = [];
      const parsedImages = Array.isArray(images) ? images : JSON.parse(images || '[]');

      for (const img of parsedImages) {
        if (img.url) {
          processedImages.push({
            url: img.url,
            caption: img.caption || '',
            altText: img.altText || ''
          });
        }
      }

      // Process uploaded image files
      if (req.files) {
        const imageFiles = (req.files as Express.Multer.File[]).filter(file => 
          file.fieldname.startsWith('imageFiles[')
        );

        for (const file of imageFiles) {
          const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
          const metadata = parsedImages[index] || {};

          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { folder: 'lesson-images' }
          );

          processedImages.push({
            url: result.secure_url,
            caption: metadata.caption || '',
            altText: metadata.altText || file.originalname
          });
        }
      }

      lesson.images = processedImages;
    }

    // Process resources - handle both URLs and file uploads
    if (resources !== undefined) {
      const processedResources = [];
      const parsedResources = Array.isArray(resources) ? resources : JSON.parse(resources || '[]');

      for (const res of parsedResources) {
        if (res.fileUrl) {
          processedResources.push({
            title: res.title || '',
            fileUrl: res.fileUrl,
            fileType: res.fileType || (res.fileUrl.includes('.pdf') ? 'pdf' : 'document')
          });
        }
      }

      // Process uploaded resource files
      if (req.files) {
        const resourceFiles = (req.files as Express.Multer.File[]).filter(file => 
          file.fieldname.startsWith('resourceFiles[')
        );

        for (const file of resourceFiles) {
          const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
          const metadata = parsedResources[index] || {};

          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { 
              folder: 'lesson-resources',
              resource_type: 'auto'
            }
          );

          let fileType = 'document';
          if (file.mimetype.includes('pdf')) fileType = 'pdf';
          else if (file.mimetype.includes('word')) fileType = 'doc';
          else if (file.mimetype.includes('excel')) fileType = 'xls';
          else if (file.mimetype.includes('powerpoint')) fileType = 'ppt';

          processedResources.push({
            title: metadata.title || file.originalname,
            fileUrl: result.secure_url,
            fileType: fileType
          });
        }
      }

      lesson.resources = processedResources;
    }

    // Update basic fields
    if (title !== undefined) lesson.title = title;
    if (content !== undefined) lesson.content = content;
    if (videoUrl !== undefined) lesson.videoUrl = videoUrl;
    if (videoThumbnail !== undefined) lesson.videoThumbnail = videoThumbnail;
    if (videoDuration !== undefined) lesson.videoDuration = videoDuration;
    if (order !== undefined) lesson.order = order;
    if (isPublished !== undefined) lesson.isPublished = isPublished;

    await lesson.save();

    if (isPublished !== undefined) {
      await recalculateProgressForCourse(lesson.courseId);
    }

    res.status(200).json(lesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    next(error);
  }
};




// // Create a new lesson directly in a course
// export const createLessonInCourse = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { courseId } = req.params;
//     const {
//       title, content, videoUrl, videoThumbnail, videoDuration,
//       resources, images, order, isPublished
//     } = req.body;
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

//     if (!title) {
//       res.status(400).json({ message: 'Lesson title is required' });
//       return;
//     }

//     let lessonOrder = order;
//     if (lessonOrder === undefined) {
//       const highestOrder = await Lesson.findOne({ courseId, sectionId: null })
//         .sort({ order: -1 })
//         .select('order');
//       lessonOrder = highestOrder ? highestOrder.order + 1 : 0;
//     }

//     const newLesson = await Lesson.create({
//       title,
//       courseId,
//       content: content || '',
//       videoUrl,
//       videoThumbnail,
//       videoDuration,
//       resources: resources || [],
//       images: images || [],
//       order: lessonOrder,
//       isPublished: isPublished ?? false,
//       createdBy: userId
//     });

//     res.status(201).json(newLesson);
//   } catch (error) {
//     console.error('Error creating lesson:', error);
//     next(error);
//   }
// };

// // Create a new lesson in a section
// export const createLessonInSection = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { sectionId } = req.params;
//     const {
//       title, content, videoUrl, videoThumbnail, videoDuration,
//       resources, images, order, isPublished
//     } = req.body;
//     const userId = req.user?._id;

//     if (!mongoose.Types.ObjectId.isValid(sectionId)) {
//       res.status(400).json({ message: 'Invalid section ID' });
//       return;
//     }

//     const section = await Section.findById(sectionId);
//     if (!section) {
//       res.status(404).json({ message: 'Section not found' });
//       return;
//     }

//     if (!title) {
//       res.status(400).json({ message: 'Lesson title is required' });
//       return;
//     }

//     let lessonOrder = order;
//     if (lessonOrder === undefined) {
//       const highestOrder = await Lesson.findOne({ sectionId })
//         .sort({ order: -1 })
//         .select('order');
//       lessonOrder = highestOrder ? highestOrder.order + 1 : 0;
//     }

//     const newLesson = await Lesson.create({
//       title,
//       courseId: section.courseId,
//       sectionId,
//       content: content || '',
//       videoUrl,
//       videoThumbnail,
//       videoDuration,
//       resources: resources || [],
//       images: images || [],
//       order: lessonOrder,
//       isPublished: isPublished ?? false,
//       createdBy: userId
//     });

//     res.status(201).json(newLesson);
//   } catch (error) {
//     console.error('Error creating lesson in section:', error);
//     next(error);
//   }
// };

// // Update an existing lesson
// export const updateLesson = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { lessonId } = req.params;
//     const {
//       title, content, videoUrl, videoThumbnail, videoDuration,
//       resources, images, sectionId, order, isPublished
//     } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(lessonId)) {
//       res.status(400).json({ message: 'Invalid lesson ID' });
//       return;
//     }

//     const lesson = await Lesson.findById(lessonId);
//     if (!lesson) {
//       res.status(404).json({ message: 'Lesson not found' });
//       return;
//     }

//     if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
//       const section = await Section.findById(sectionId);
//       if (!section) {
//         res.status(404).json({ message: 'Section not found' });
//         return;
//       }
//       if (section.courseId.toString() !== lesson.courseId.toString()) {
//         res.status(400).json({ message: 'Section must belong to the same course' });
//         return;
//       }
//       lesson.sectionId = sectionId;
//     } else if (sectionId === null) {
//       lesson.sectionId = undefined;
//     }

//     if (title !== undefined) lesson.title = title;
//     if (content !== undefined) lesson.content = content;
//     if (videoUrl !== undefined) lesson.videoUrl = videoUrl;
//     if (videoThumbnail !== undefined) lesson.videoThumbnail = videoThumbnail;
//     if (videoDuration !== undefined) lesson.videoDuration = videoDuration;
//     if (resources !== undefined) lesson.resources = resources;
//     if (images !== undefined) lesson.images = images;
//     if (order !== undefined) lesson.order = order;
//     if (isPublished !== undefined) lesson.isPublished = isPublished;

//     await lesson.save();

//     if (isPublished !== undefined) {
//       await recalculateProgressForCourse(lesson.courseId);
//     }

//     res.status(200).json(lesson);
//   } catch (error) {
//     console.error('Error updating lesson:', error);
//     next(error);
//   }
// };
















// Delete a lesson
export const deleteLesson = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lessonId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      res.status(400).json({ message: 'Invalid lesson ID' });
      return;
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const courseId = lesson.courseId;

    await Lesson.findByIdAndDelete(lessonId);
    await Progress.updateMany({ courseId, completedLessons: lessonId }, { $pull: { completedLessons: lessonId } });
    await Progress.updateMany({ courseId, lastAccessedLesson: lessonId }, { $unset: { lastAccessedLesson: '' } });
    await recalculateProgressForCourse(courseId);

    res.status(200).json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    next(error);
  }
};







// Helper function to recalculate progress percentages for a course
async function recalculateProgressForCourse(courseId: mongoose.Types.ObjectId) {
    try {
      // Get total published lessons count
      const totalLessons = await Lesson.countDocuments({ 
        courseId, 
        isPublished: true 
      });
      
      // Get all progress records for this course
      const progressRecords = await Progress.find({ courseId });
      
      // For each user progress, recalculate percentage
      for (const progress of progressRecords) {
        // Get completed lessons that are still published
        const validCompletedLessons = await Lesson.find({
          _id: { $in: progress.completedLessons },
          isPublished: true
        });
        
        // Update completed lessons to only include published ones
        progress.completedLessons = validCompletedLessons.map(lesson => lesson._id);
        
        // Calculate new percentage
        progress.completionPercentage = totalLessons > 0 
          ? (progress.completedLessons.length / totalLessons) * 100 
          : 0;
        
        await progress.save();
      }
    } catch (error) {
      console.error('Error recalculating progress:', error);
    }
  }