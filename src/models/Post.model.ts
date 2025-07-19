
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
  links: string[];
  youtubeLink?: string;
  tags: string[];
  likes: mongoose.Types.ObjectId[];
  poll?: IPoll;
  isPinned: boolean;
  totalComments: number;  
  createdAt: Date;
  updatedAt: Date;
  lastComment:Date
}

const PostSchema: Schema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String},
    image: { type: String },
    links: [{type:String}],
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
    totalComments: { type: Number, default: 0 },
    lastComment:{type:Date, default:null}
  },
  { timestamps: true }
);

export default mongoose.model<IPost>('Post', PostSchema);