// models/StarClubAttendance.model.ts

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAttendance extends Document {
  userId: Types.ObjectId;
  attendance: {
    date: Date;
    status: 'present';
  }[];
}

const AttendanceSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    attendance: [
      {
        date: { type: Date, required: true },
        status: { type: String, required: true, enum: ['present'] },
        _id: false, 
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create an index on the attendance date for faster lookups
AttendanceSchema.index({ 'attendance.date': 1 });

export default mongoose.model<IAttendance>('StarClubAttendance', AttendanceSchema);