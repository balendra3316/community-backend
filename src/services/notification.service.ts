

import { Types } from 'mongoose';
import Notification from '../models/Notification.model';

export const emitNewNotification = (
  io: any,
  recipientId: Types.ObjectId | string,
  notificationData: any
) => {
  io.to(recipientId.toString()).emit('newNotification', notificationData);
};

export const emitUnreadCount :any = (
  io: any,
  recipientId: Types.ObjectId | string,
  count: number
) => {
  io.to(recipientId.toString()).emit('unreadCountUpdate', { count });
};