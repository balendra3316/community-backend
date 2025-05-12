// src/models/User.model.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  badges: string[];
  bio: string;
  points: Number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    isAdmin: { type: Boolean, default: false },
    badges: [{ type: String }],
    bio: { type: String, default: '' },
    points:{type:Number, default:0}
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);