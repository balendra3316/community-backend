import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IJournalEntry extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  practiceDate: Date;
  minutes: number;
  mood: number;
  energy: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntrySchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    practiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    minutes: {
      type: Number,
      required: [true, 'Please enter practice duration in minutes'],
      min: [1, 'Practice time must be at least 1 minute'],
      max: [1500, 'Practice time cannot exceed 1500 minutes'],
    },
    mood: {
      type: Number,
      required: [true, 'Please rate your mood'],
      min: 1,
      max: 5,
    },
    energy: {
      type: Number,
      required: [true, 'Please rate your energy level'],
      min: 1,
      max: 5,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot be more than 500 characters'],
      trim: true,
      default: ''
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);