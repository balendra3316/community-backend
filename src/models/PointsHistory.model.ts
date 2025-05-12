// src/models/PointsHistory.model.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPointsHistory extends Document {
  userId: Types.ObjectId;
  points: number;
  createdAt: Date;
}

const PointsHistorySchema: Schema = new Schema(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
      index: true 
    },
    points: { 
      type: Number, 
      required: true 
    }
  },
  { 
    timestamps: true 
  }
);

// Add TTL index to automatically delete records after 30 days
PointsHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IPointsHistory>('PointsHistory', PointsHistorySchema);