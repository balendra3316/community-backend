
import mongoose, { Document, Schema, Types } from 'mongoose';

interface IResource {
  title: string;
  fileUrl: string;
  fileType: string;
}

interface IImage {
  url: string;
  caption?: string;
  altText?: string;
}

interface IUrl {
  title: string;
  url: string;
}

export interface ILesson extends Document {
  _id: Types.ObjectId;
  title: string;
  courseId: Types.ObjectId;
  sectionId?: Types.ObjectId;
  content: string;
  videoUrl?: string;
  videoThumbnail?: string;
  videoDuration?: number;
  resources: IResource[];
  images: IImage[];
  urls: IUrl[];
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
}

const LessonSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    content: { type: String },
    videoUrl: { type: String },
    videoThumbnail: { type: String },
    videoDuration: { type: Number },
    resources: [
      {
        title: { type: String },
        fileUrl: { type: String },
        fileType: { type: String }
      }
    ],
    images: [
      {
        url: { type: String },
        caption: { type: String },
        altText: { type: String }
      }
    ],
    urls: [
      {
        title: { type: String },
        url: { type: String }
      }
    ],
    order: { type: Number, required: true },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);


LessonSchema.index({ courseId: 1, order: 1 });
export default mongoose.model<ILesson>('Lesson', LessonSchema);