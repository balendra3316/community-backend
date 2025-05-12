// src/models/Post.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IPoll {
  options: { text: string; votes: string[] }[];
  voters: string[];
}

export interface IPost extends Document {
  author: mongoose.Types.ObjectId;
  title: string;
  content: string;
  image?: string;
  youtubeLink?: string;
  tags: string[];
  likes: mongoose.Types.ObjectId[];
  poll?: IPoll;
  isPinned: boolean;
  totalComments: number;  // Add this field
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String },
    youtubeLink: { type: String },
    tags: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    poll: {
      options: [
        {
          text: { type: String },
          votes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
        }
      ],
      voters: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    },
    isPinned: { type: Boolean, default: false },
    totalComments: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model<IPost>('Post', PostSchema);