



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
  points: number;
  myPurchasedCourses: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  hasPurchasedCourse(courseId: string | Types.ObjectId): boolean;
}

const UserSchema: Schema = new Schema(
  {
    googleId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    avatar: { 
      type: String, 
      default: '',
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\//.test(v);
        },
        message: 'Avatar must be a valid URL'
      }
    },
    isAdmin: { 
      type: Boolean, 
      default: false,
      index: true
    },
    badges: [{ 
      type: String,
      trim: true
    }],
    bio: { 
      type: String, 
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      trim: true
    },
    points: {
      type: Number, 
      default: 0,
      min: [0, 'Points cannot be negative'],
      index: true
    },
    myPurchasedCourses: [{
      type: Schema.Types.ObjectId,
      ref: 'Course'
    }]
  },
  { 
    timestamps: true,
    versionKey: false
  }
);


UserSchema.index({ 
  name: 'text', 
  bio: 'text' 
}, {
  name: 'user_search_index'
});

UserSchema.index({ email: 1, googleId: 1 });
UserSchema.index({ points: -1, createdAt: -1 });


UserSchema.pre('save', function(next) {
  if (this.email && typeof this.email === 'string') {
    this.email = this.email.toLowerCase();
  }
  
  if (this.name && typeof this.name === 'string') {
    this.name = this.name.trim();
  }
  
  if (this.bio && typeof this.bio === 'string') {
    this.bio = this.bio.trim();
  }
  
  next();
});


UserSchema.statics.findByEmailOrGoogleId = function(email: string, googleId?: string) {
  const query: any = { email: email.toLowerCase() };
  if (googleId) {
    query.$or = [
      { email: email.toLowerCase() },
      { googleId }
    ];
  }
  return this.findOne(query).lean();
};


UserSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.__v;
  return userObject;
};

UserSchema.methods.hasPurchasedCourse = function(courseId: string | Types.ObjectId) {
  return this.myPurchasedCourses.some((purchasedId: Types.ObjectId) => 
    purchasedId.toString() === courseId.toString()
  );
};

export default mongoose.model<IUser>('User', UserSchema);