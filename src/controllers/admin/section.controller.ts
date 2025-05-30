import { Request, Response } from 'express';
import Section from '../../models/Section.model';
import Course from '../../models/Course.model';
import Lesson from '../../models/Lesson.model';
import mongoose from 'mongoose';

// Create a new section for a course
export const createSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, order, isPublished } = req.body;
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

    if (!title) {
      res.status(400).json({ message: 'Section title is required' });
      return;
    }

    let sectionOrder = order;
    if (sectionOrder === undefined) {
      const highestOrder = await Section.findOne({ courseId })
        .sort({ order: -1 })
        .select('order');
      sectionOrder = highestOrder ? highestOrder.order + 1 : 0;
    }

    const newSection = await Section.create({
      title,
      courseId,
      order: sectionOrder,
      isPublished: isPublished !== undefined ? isPublished : false,
      createdBy: userId
    });

    res.status(201).json(newSection);
    return;
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ message: 'Failed to create section' });
    return;
  }
};

// Update an existing section
export const updateSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId } = req.params;
    const { title, order, isPublished } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      res.status(400).json({ message: 'Invalid section ID' });
      return;
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      res.status(404).json({ message: 'Section not found' });
      return;
    }

    if (title !== undefined) section.title = title;
    if (order !== undefined) section.order = order;
    if (isPublished !== undefined) section.isPublished = isPublished;

    await section.save();
    res.status(200).json(section);
    return;
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ message: 'Failed to update section' });
    return;
  }
};

// Delete a section
export const deleteSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      res.status(400).json({ message: 'Invalid section ID' });
      return;
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      res.status(404).json({ message: 'Section not found' });
      return;
    }

    await Section.findByIdAndDelete(sectionId);

    await Lesson.updateMany(
      { sectionId },
      { $unset: { sectionId: "" } }
    );

    res.status(200).json({ 
      message: 'Section deleted successfully. Lessons have been moved directly under the course.' 
    });
    return;
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ message: 'Failed to delete section' });
    return;
  }
}
