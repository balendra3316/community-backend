


import { Request, Response, NextFunction } from 'express';
import Lesson from '../../models/Lesson.model';
import Course from '../../models/Course.model';
import Section from '../../models/Section.model';
import Progress from '../../models/Progress.model';
import mongoose from 'mongoose';
import path from 'path';
import { BunnyStorageService } from '../../services/bunnyStorage.service';

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


    let lessonOrder = order;
    if (lessonOrder === undefined) {
      const highestOrder = await Lesson.findOne({ courseId, sectionId: null })
        .sort({ order: -1 })
        .select('order');
      lessonOrder = highestOrder ? highestOrder.order + 1 : 0;
    }


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


    if (req.files) {
      const imageFiles = (req.files as Express.Multer.File[]).filter(file => 
        file.fieldname.startsWith('imageFiles[')
      );

      for (const file of imageFiles) {

        const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
        const metadata = parsedImages[index] || {};

        try {

          const imageUrl = await BunnyStorageService.uploadImage(
            file.buffer,
            file.originalname,
            'lesson-images'
          );

          processedImages.push({
            url: imageUrl,
            caption: metadata.caption || '',
            altText: metadata.altText || file.originalname
          });
        } catch (error) {
          throw new Error('Failed to upload image');
        }
      }
    }


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


    if (req.files) {
      const resourceFiles = (req.files as Express.Multer.File[]).filter(file => 
        file.fieldname.startsWith('resourceFiles[')
      );

      for (const file of resourceFiles) {

        const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
        const metadata = parsedResources[index] || {};

        try {

          const timestamp = Date.now();
          const extension = path.extname(file.originalname);
          const baseName = path.basename(file.originalname, extension);
          const uniqueFileName = `${timestamp}-${baseName}${extension}`;


          const resourceUrl = await BunnyStorageService.uploadImage(
            file.buffer,
            uniqueFileName,
            'lesson-resources'
          );


          let fileType = 'document';
          if (file.mimetype.includes('pdf')) fileType = 'pdf';
          else if (file.mimetype.includes('word')) fileType = 'doc';
          else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) fileType = 'xls';
          else if (file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation')) fileType = 'ppt';

          processedResources.push({
            title: metadata.title || file.originalname,
            fileUrl: resourceUrl,
            fileType: fileType
          });
        } catch (error) {
          throw new Error('Failed to upload resource file');
        }
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

    await Course.findByIdAndUpdate(
      courseId,
      { $inc: { totalLessons: 1 } },
      { new: true }
    );

    res.status(201).json(newLesson);
  } catch (error) {
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


    if (req.files) {
      const imageFiles = (req.files as Express.Multer.File[]).filter(file => 
        file.fieldname.startsWith('imageFiles[')
      );

      for (const file of imageFiles) {
        const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
        const metadata = parsedImages[index] || {};

        try {
          const imageUrl = await BunnyStorageService.uploadImage(
            file.buffer,
            file.originalname,
            'lesson-images'
          );

          processedImages.push({
            url: imageUrl,
            caption: metadata.caption || '',
            altText: metadata.altText || file.originalname
          });
        } catch (error) {
          throw new Error('Failed to upload image');
        }
      }
    }


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


    if (req.files) {
      const resourceFiles = (req.files as Express.Multer.File[]).filter(file => 
        file.fieldname.startsWith('resourceFiles[')
      );

      for (const file of resourceFiles) {
        const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
        const metadata = parsedResources[index] || {};

        try {

          const timestamp = Date.now();
          const extension = path.extname(file.originalname);
          const baseName = path.basename(file.originalname, extension);
          const uniqueFileName = `${timestamp}-${baseName}${extension}`;

          const resourceUrl = await BunnyStorageService.uploadImage(
            file.buffer,
            uniqueFileName,
            'lesson-resources'
          );

          let fileType = 'document';
          if (file.mimetype.includes('pdf')) fileType = 'pdf';
          else if (file.mimetype.includes('word')) fileType = 'doc';
          else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) fileType = 'xls';
          else if (file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation')) fileType = 'ppt';

          processedResources.push({
            title: metadata.title || file.originalname,
            fileUrl: resourceUrl,
            fileType: fileType
          });
        } catch (error) {
          throw new Error('Failed to upload resource file');
        }
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

    await Course.findByIdAndUpdate(
      section.courseId,
      { $inc: { totalLessons: 1 } },
      { new: true }
    );

    res.status(201).json(newLesson);
  } catch (error) {
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


    if (images !== undefined) {

      if (lesson.images && lesson.images.length > 0) {
        for (const oldImage of lesson.images) {
          if (oldImage.url && oldImage.url.includes('bunnycdn.com')) {
            try {
              await BunnyStorageService.deleteFile(oldImage.url);
            } catch (error) {
            }
          }
        }
      }

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


      if (req.files) {
        const imageFiles = (req.files as Express.Multer.File[]).filter(file => 
          file.fieldname.startsWith('imageFiles[')
        );

        for (const file of imageFiles) {
          const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
          const metadata = parsedImages[index] || {};

          try {
            const imageUrl = await BunnyStorageService.uploadImage(
              file.buffer,
              file.originalname,
              'lesson-images'
            );

            processedImages.push({
              url: imageUrl,
              caption: metadata.caption || '',
              altText: metadata.altText || file.originalname
            });
          } catch (error) {
            throw new Error('Failed to upload image');
          }
        }
      }

      lesson.images = processedImages;
    }


    if (resources !== undefined) {

      if (lesson.resources && lesson.resources.length > 0) {
        for (const oldResource of lesson.resources) {
          if (oldResource.fileUrl && oldResource.fileUrl.includes('bunnycdn.com')) {
            try {
              await BunnyStorageService.deleteFile(oldResource.fileUrl);
            } catch (error) {
            }
          }
        }
      }

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


      if (req.files) {
        const resourceFiles = (req.files as Express.Multer.File[]).filter(file => 
          file.fieldname.startsWith('resourceFiles[')
        );

        for (const file of resourceFiles) {
          const index = parseInt(file.fieldname.match(/\[(\d+)\]/)?.[1] || '0');
          const metadata = parsedResources[index] || {};

          try {

            const timestamp = Date.now();
            const extension = path.extname(file.originalname);
            const baseName = path.basename(file.originalname, extension);
            const uniqueFileName = `${timestamp}-${baseName}${extension}`;

            const resourceUrl = await BunnyStorageService.uploadImage(
              file.buffer,
              uniqueFileName,
              'lesson-resources'
            );

            let fileType = 'document';
            if (file.mimetype.includes('pdf')) fileType = 'pdf';
            else if (file.mimetype.includes('word')) fileType = 'doc';
            else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) fileType = 'xls';
            else if (file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation')) fileType = 'ppt';

            processedResources.push({
              title: metadata.title || file.originalname,
              fileUrl: resourceUrl,
              fileType: fileType
            });
          } catch (error) {
            throw new Error('Failed to upload resource file');
          }
        }
      }

      lesson.resources = processedResources;
    }


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
    next(error);
  }
};

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

    const lessonObjectId = new mongoose.Types.ObjectId(lessonId);
    

    const lesson = await Lesson.findById(lessonObjectId);
    
    if (!lesson) {
      res.status(404).json({ message: 'Lesson not found' });
      return;
    }

    const courseId = lesson.courseId;


    if (lesson.images && lesson.images.length > 0) {
      for (const image of lesson.images) {
        if (image.url && image.url.includes('bunnycdn.com')) {
          try {
            await BunnyStorageService.deleteFile(image.url);
          } catch (error) {
          }
        }
      }
    }


    if (lesson.resources && lesson.resources.length > 0) {
      for (const resource of lesson.resources) {
        if (resource.fileUrl && resource.fileUrl.includes('bunnycdn.com')) {
          try {
            await BunnyStorageService.deleteFile(resource.fileUrl);
          } catch (error) {
          }
        }
      }
    }


    await Lesson.findByIdAndDelete(lessonObjectId);


    await Progress.updateMany(
      { courseId },
      { 
        $pull: { 
          completedLessons: lessonObjectId,
          lastAccessedLesson: lessonObjectId // Also remove from lastAccessedLesson if it was this lesson
        } 
      }
    );


    await Course.findByIdAndUpdate(
      courseId,
      { $inc: { totalLessons: -1 } },
      { new: true }
    );


    await recalculateProgressForCourse(courseId);

    res.status(200).json({ 
      message: 'Lesson and associated files deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
};








async function recalculateProgressForCourse(courseId: mongoose.Types.ObjectId) {
    try {

      const totalLessons = await Lesson.countDocuments({ 
        courseId, 
        isPublished: true 
      });
      

      const progressRecords = await Progress.find({ courseId });
      

      for (const progress of progressRecords) {

        const validCompletedLessons = await Lesson.find({
          _id: { $in: progress.completedLessons },
          isPublished: true
        });
        

        progress.completedLessons = validCompletedLessons.map(lesson => lesson._id);
        

        progress.completionPercentage = totalLessons > 0 
          ? (progress.completedLessons.length / totalLessons) * 100 
          : 0;
        
        await progress.save();
      }
    } catch (error) {
    }
  }