













































import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  image?: string;
  youtubeLink?: string;
  likes: mongoose.Types.ObjectId[];
  parent?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    image: { type: String },
    youtubeLink: { type: String },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    parent: { type: Schema.Types.ObjectId, ref: 'Comment' }
  },
  { timestamps: true }
);


CommentSchema.index({ post: 1, parent: 1, createdAt: 1 }); // For getting comments by post with replies
CommentSchema.index({ post: 1, parent: 1 }); // For counting and filtering
CommentSchema.index({ author: 1 }); // For author-based queries
CommentSchema.index({ parent: 1 }); // For finding replies
CommentSchema.index({ createdAt: 1 }); // For sorting by date

export default mongoose.model<IComment>('Comment', CommentSchema);