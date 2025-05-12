


// src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import Notification from '../models/Notification.model';
import { Types } from 'mongoose';




// Get all notifications for the current user

// export const getNotifications = async (req: Request, res: Response): Promise<void>=> {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: 'Not authenticated' });
//       return;
//     }

//     const notifications = await Notification.find({ recipient: req.user._id })
//       .sort({ createdAt: -1 })
//       .populate('sender', 'name avatar')
//       .populate({
//         path: 'post',
//         model: 'Post',
//         // Include all fields needed by PostDetailView
//         select: 'title content image youtubeLink tags likes poll isPinned totalComments author createdAt updatedAt'
//       })
//       .lean();

//     res.json(notifications);
//   } catch (error) {
//     console.error('Get notifications error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


// Get all notifications for the current user
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate('sender', 'name avatar')
      .populate({
        path: 'post',
        model: 'Post',
        // Include all fields needed by PostDetailView
        select: 'title content image youtubeLink tags likes poll isPinned totalComments author createdAt updatedAt',
        // Now also populate the author of the post
        populate: {
          path: 'author',
          model: 'User',
          select: 'name avatar'
        }
      })
      .lean();

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




// Mark notification as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    notification.read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await notification.deleteOne();

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

// Get unread notification count
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
