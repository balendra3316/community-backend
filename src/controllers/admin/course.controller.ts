

import { Request, Response, NextFunction } from 'express';
import Course from '../../models/Course.model';
import Section from '../../models/Section.model';
import Lesson from '../../models/Lesson.model';
import Progress from '../../models/Progress.model';
import mongoose from 'mongoose';
import { BunnyStorageService } from '../../services/bunnyStorage.service'; // Adjust path as needed
import { deleteImageFromBunnyStorage } from '../post.controller'; // Adjust path as needed


export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, order, isPaid = false, price = 0 } = req.body;
    const userId = req.user?._id;
    
    if (!title) {
      res.status(400).json({ message: 'Course title is required' });
      return;
    }

    // Ensure price is a whole number
    const roundedPrice = Math.round(Number(price));

    let coverImage = '';
    if (req.file) {
      try {
        coverImage = await BunnyStorageService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          'course-covers'
        );
      } catch (uploadError) {
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
      isPaid: Boolean(isPaid), // Save exactly as true/false
      price: roundedPrice      // Always save as whole number
    });

    res.status(201).json(newCourse);
  } catch (error) {
    next(error);
  }
};
export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, description, order, isPaid, price } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      res.status(400).json({ message: 'Invalid course ID' });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Update isPaid status if provided
    if (isPaid !== undefined) {
      course.isPaid = isPaid;
    }

    // Validate price only if course is being set as paid
    if (isPaid === true && (price === undefined || price === null || isNaN(price) || price < 0)) {
      res.status(400).json({ message: 'Valid price is required when setting course as paid' });
      return;
    }

    // Update price if provided (regardless of isPaid status)
    if (price !== undefined) {
      course.price = Number(price);
    }

    // Update other fields
    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (order !== undefined) course.order = order;

    // Handle cover image update
    const oldCoverImage = course.coverImage;
    if (req.file) {
      try {
        const newCoverImage = await BunnyStorageService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          'course-covers'
        );
        course.coverImage = newCoverImage;
      } catch (uploadError) {
        res.status(500).json({ message: 'Image upload failed' });
        return;
      }
    }

    await course.save();
    res.status(200).json(course);

    if (req.file && oldCoverImage) {
      setImmediate(() => {
        deleteImageFromBunnyStorage(oldCoverImage);
      });
    }
  } catch (error) {
    next(error);
  }
};

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


    const coverImageUrl = course.coverImage;


    await Course.findByIdAndDelete(courseId);
    await Section.deleteMany({ courseId });
    await Lesson.deleteMany({ courseId });
    await Progress.deleteMany({ courseId });


    res.status(200).json({
      message: 'Course and all associated data deleted successfully',
    });


    if (coverImageUrl) {
      setImmediate(() => {
        deleteImageFromBunnyStorage(coverImageUrl);
      });
    }

  } catch (error) {
    next(error);
  }
};

