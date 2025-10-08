
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISection extends Document {
  _id: Types.ObjectId;
  title: string;
  courseId: Types.ObjectId;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
}

const SectionSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    order: { type: Number, required: true },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

SectionSchema.index({ courseId: 1, order: 1 });

export default mongoose.model<ISection>('Section', SectionSchema);