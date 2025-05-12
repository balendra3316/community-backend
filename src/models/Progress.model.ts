// src/models/Progress.model.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProgress extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  completedLessons: Types.ObjectId[];
  lastAccessedLesson?: Types.ObjectId;
  completionPercentage: number;
  updatedAt: Date;
  createdAt: Date;
}

const ProgressSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    lastAccessedLesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    completionPercentage: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Compound index for faster lookups
ProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model<IProgress>('Progress', ProgressSchema);