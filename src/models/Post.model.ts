// models/Post.model.ts

import mongoose, { Document, Schema } from "mongoose";

export interface IPoll {
  options: { text: string; votes: string[] }[];
  voters: string[];
}

export interface IPost extends Document {
  author: mongoose.Types.ObjectId;
  title: string;
  content: string;
  image?: string;
  links: string[];
  youtubeLink?: string;

  videoUrl?: string;
  videoThumbnailUrl?: string;
  videoGuid?: string;

  tags: string[];
  likes: mongoose.Types.ObjectId[];
  poll?: IPoll;
  isPinned: boolean;
  totalComments: number;
  createdAt: Date;
  updatedAt: Date;
  lastComment: Date;
}

const PostSchema: Schema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: {
      type: String,
      required: true,
      maxlength: [200, "Title cannot be more than 200 characters long."],
    },
    content: { type: String,
      maxlength: [2500, 'Content cannot be more than 1500 characters long.'],
     },
    image: { type: String },
    links: {
      type: [{ type: String, maxlength: [2048, 'Link URL cannot exceed 2048 characters.'], }
        
      ],
      validate: [
        (arr: string[]) => arr.length <= 5,
        "A post can have a maximum of 5 links.",
      ],
    },
    youtubeLink: { type: String },

    videoUrl: { type: String },
    videoThumbnailUrl: { type: String },
    videoGuid: { type: String },

    tags: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    poll: {
      options: [
        {
          text: { type: String, maxlength: [30, 'Poll option text cannot exceed 30 characters.'], },
          votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
        },
      ],
      voters: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    isPinned: { type: Boolean, default: false },
    totalComments: { type: Number, default: 0 },
    lastComment: { type: Date, default: null },
  },
  { timestamps: true }
);


PostSchema.index({ isPinned: -1, createdAt: -1 });
PostSchema.index({ isPinned: -1, likes: 1, createdAt: -1 });
PostSchema.index({ author: 1, createdAt: -1 });


export default mongoose.model<IPost>("Post", PostSchema);
