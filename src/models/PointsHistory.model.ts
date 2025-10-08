
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


PointsHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

PointsHistorySchema.index({ userId: 1, createdAt: -1 });




export default mongoose.model<IPointsHistory>('PointsHistory', PointsHistorySchema);





