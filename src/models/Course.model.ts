// src/models/Course.model.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  coverImage: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
}

const CourseSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    coverImage: { type: String },
    order: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>('Course', CourseSchema);