import mongoose, { Schema, Document } from 'mongoose';


export interface IAttendanceRecord {
  date: Date;
  status: 'present';
}

// Interface for the User document
export interface IAttendanceUser extends Document {
  name: string;
  email: string;
  joinDate: Date;
  whatsappNumber: string;
  attendance: IAttendanceRecord[];
}

const AttendanceUserSchema: Schema = new Schema({
  name: { type: String, required: false }, 
  email: { type: String, required: true, unique: true, lowercase: true },
  joinDate: { type: Date, default: Date.now },
  whatsappNumber: { type: String, required: true, unique: true },
  attendance: [{
    date: { type: Date, required: true },
    status: { type: String, required: true, enum: ['present'] }
  }]
});

export default mongoose.model<IAttendanceUser>('AttendanceUser', AttendanceUserSchema);