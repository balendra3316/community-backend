// // src/models/Notification.model.ts
// import mongoose, { Document, Schema } from 'mongoose';

// export interface INotification extends Document {
//   recipient: mongoose.Types.ObjectId;
//   sender: mongoose.Types.ObjectId;
//   type: 'like' | 'comment' | 'reply';
//   post: mongoose.Types.ObjectId;
//   comment?: mongoose.Types.ObjectId;
//   read: boolean;
//   createdAt: Date;
// }

// const NotificationSchema: Schema = new Schema(
//   {
//     recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     type: { type: String, enum: ['like', 'comment', 'reply'], required: true },
//     post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
//     comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
//     read: { type: Boolean, default: false }
//   },
//   { timestamps: true }
// );

// // Create TTL index to automatically delete notifications after 3 days
// NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

// export default mongoose.model<INotification>('Notification', NotificationSchema);


// src/models/Notification.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'reply';
  post: mongoose.Types.ObjectId;
  comment?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'comment', 'reply'], required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
    read: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Compound indexes for better query performance
NotificationSchema.index({ recipient: 1, createdAt: -1 }); // For getNotifications query
NotificationSchema.index({ recipient: 1, read: 1 }); // For unread count and markAllAsRead
NotificationSchema.index({ recipient: 1, _id: 1 }); // For markAsRead query

// Create TTL index to automatically delete notifications after 3 days (increased from 3 days)
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

// Prevent duplicate notifications for the same action
NotificationSchema.index(
  { recipient: 1, sender: 1, type: 1, post: 1, comment: 1 }, 
  { unique: true, sparse: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);