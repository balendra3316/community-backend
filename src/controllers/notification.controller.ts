
import { Request, Response } from "express";
import Notification from "../models/Notification.model";


export const getNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("sender", "name avatar")
      .populate({
        path: "post",
        model: "Post",
        select:
          "title content image youtubeLink tags likes poll isPinned totalComments author createdAt updatedAt",
        populate: {
          path: "author",
          model: "User",
          select: "name avatar",
        },
      })
      .lean()
      .exec();

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const markAllAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const result = await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );


    if (result.modifiedCount > 0) {
      const io = req.app.get("io");
      if (io) {
        io.to(req.user._id.toString()).emit("notificationRead", {
          notificationId: "all",
          unreadCount: 0,
        });
      }
    }

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const markAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user._id,
        read: false, // Only update if it's currently unread
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      res
        .status(404)
        .json({ message: "Notification not found or already read" });
      return;
    }


    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });


    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("notificationRead", {
        notificationId: notification._id,
        unreadCount,
      });
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const getUnreadCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const deleteNotification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    await notification.deleteOne();

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
