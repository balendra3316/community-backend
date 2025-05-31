
import Notification from '../models/Notification.model';
import mongoose from 'mongoose';

interface NotificationData {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'reply';
  post: mongoose.Types.ObjectId;
  comment?: mongoose.Types.ObjectId;
}

export const createNotification = async (data: NotificationData) => {
  try {
    const notification = new Notification({
      recipient: data.recipient,
      sender: data.sender,
      type: data.type,
      post: data.post,
      comment: data.comment,
    });

    await notification.save();
    return notification;
  } catch (error) {
    throw error;
  }
};