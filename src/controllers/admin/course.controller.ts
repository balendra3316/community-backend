// import { Request, Response, NextFunction } from 'express';
// import Course from '../../models/Course.model';
// import Section from '../../models/Section.model';
// import Lesson from '../../models/Lesson.model';
// import Progress from '../../models/Progress.model';
// import mongoose from 'mongoose';

// import cloudinary from '../..//config/cloudinary';

// // Create a new course
// export const createCourse = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { title, description, order } = req.body;
//     const userId = req.user?._id;
    
//     if (!title) {
//       res.status(400).json({ message: 'Course title is required' });
//       return;
//     }

//     let coverImage = '';
//     if (req.file) {
//       const result = await cloudinary.uploader.upload(
//         `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
//         { folder: 'course-covers' }
//       );
//       coverImage = result.secure_url;
//     }

//     const newCourse = await Course.create({
//       title,
//       description: description || '',
//       coverImage,
//       order: order || 0,
//       createdBy: userId,
//     });

//     res.status(201).json(newCourse);
//   } catch (error) {
//     console.error('Error creating course:', error);
//     next(error);
//   }
// };

// // Update an existing course
// export const updateCourse = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { courseId } = req.params;
//     const { title, description, order } = req.body;
    
//     if (!mongoose.Types.ObjectId.isValid(courseId)) {
//       res.status(400).json({ message: 'Invalid course ID' });
//       return;
//     }

//     const course = await Course.findById(courseId);
//     if (!course) {
//       res.status(404).json({ message: 'Course not found' });
//       return;
//     }

//     if (title) course.title = title;
//     if (description !== undefined) course.description = description;
//     if (order !== undefined) course.order = order;

//     // Handle image upload if file exists
//     if (req.file) {
//       const result = await cloudinary.uploader.upload(
//         `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
//         { folder: 'course-covers' }
//       );
//       course.coverImage = result.secure_url;
//     }

//     await course.save();
//     res.status(200).json(course);
//   } catch (error) {
//     console.error('Error updating course:', error);
//     next(error);
//   }
// };









// export const deleteCourse = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { courseId } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(courseId)) {
//       res.status(400).json({ message: 'Invalid course ID' });
//       return;
//     }

//     const deletedCourse = await Course.findByIdAndDelete(courseId);
//     if (!deletedCourse) {
//       res.status(404).json({ message: 'Course not found' });
//       return;
//     }

//     await Section.deleteMany({ courseId });
//     await Lesson.deleteMany({ courseId });
//     await Progress.deleteMany({ courseId });

//     res.status(200).json({
//       message: 'Course and all associated data deleted successfully',
//     });
//     return;
//   } catch (error) {
//     console.error('Error deleting course:', error);
//     next(error);
//   }
// };







import { Request, Response, NextFunction } from 'express';
import Course from '../../models/Course.model';
import Section from '../../models/Section.model';
import Lesson from '../../models/Lesson.model';
import Progress from '../../models/Progress.model';
import mongoose from 'mongoose';
import { BunnyStorageService } from '../../services/bunnyStorage.service'; // Adjust path as needed
import { deleteImageFromBunnyStorage } from '../post.controller'; // Adjust path as needed

// Extend Request interface to include user


// Create a new course
export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, order } = req.body;
    const userId = req.user?._id;
    
    if (!title) {
      res.status(400).json({ message: 'Course title is required' });
      return;
    }

    let coverImage = '';
    if (req.file) {
      try {
        coverImage = await BunnyStorageService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          'course-covers'
        );
      } catch (uploadError) {
        console.error('Course cover image upload failed:', uploadError);
        res.status(500).json({ message: 'Image upload failed' });
        return;
      }
    }

    const newCourse = await Course.create({
      title,
      description: description || '',
      coverImage,
      order: order || 0,
      createdBy: userId,
    });

    res.status(201).json(newCourse);
  } catch (error) {
    console.error('Error creating course:', error);
    next(error);
  }
};

// Update an existing course
export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, description, order } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: 'Invalid course ID' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Store old cover image for background deletion
    const oldCoverImage = course.coverImage;

    // Update course fields
    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (order !== undefined) course.order = order;

    // Handle new image upload if file exists
    if (req.file) {
      try {
        const newCoverImage = await BunnyStorageService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          'course-covers'
        );
        course.coverImage = newCoverImage;
      } catch (uploadError) {
        console.error('Course cover image upload failed:', uploadError);
        res.status(500).json({ message: 'Image upload failed' });
        return;
      }
    }

    await course.save();
    res.status(200).json(course);

    // Delete old image in background if new image was uploaded
    if (req.file && oldCoverImage) {
      setImmediate(() => {
        deleteImageFromBunnyStorage(oldCoverImage);
      });
    }

  } catch (error) {
    console.error('Error updating course:', error);
    next(error);
  }
};

// Delete a course
export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: 'Invalid course ID' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Store cover image for background deletion
    const coverImageUrl = course.coverImage;

    // Delete course and associated data from database first
    await Course.findByIdAndDelete(courseId);
    await Section.deleteMany({ courseId });
    await Lesson.deleteMany({ courseId });
    await Progress.deleteMany({ courseId });

    // Send response immediately
    res.status(200).json({
      message: 'Course and all associated data deleted successfully',
    });

    // Delete cover image from Bunny Storage in background
    if (coverImageUrl) {
      setImmediate(() => {
        deleteImageFromBunnyStorage(coverImageUrl);
      });
    }

  } catch (error) {
    console.error('Error deleting course:', error);
    next(error);
  }
};

