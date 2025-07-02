import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true
    },
    razorpayPaymentId: {
      type: String,
      sparse: true
    },
    razorpaySignature: {
      type: String,
      sparse: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    paymentMethod: {
      type: String
    }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);


PaymentSchema.index({ userId: 1, courseId: 1 });
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ razorpayOrderId: 1, status: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);