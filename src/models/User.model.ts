// // src/models/User.model.ts
// import mongoose, { Document, Schema, Types } from 'mongoose';

// export interface IUser extends Document {
//   _id: Types.ObjectId;
//   googleId: string;
//   email: string;
//   name: string;
//   avatar: string;
//   isAdmin: boolean;
//   badges: string[];
//   bio: string;
//   points: Number;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const UserSchema: Schema = new Schema(
//   {
//     googleId: { type: String, required: true, unique: true },
//     email: { type: String, required: true, unique: true },
//     name: { type: String, required: true },
//     avatar: { type: String, default: '' },
//     isAdmin: { type: Boolean, default: false },
//     badges: [{ type: String }],
//     bio: { type: String, default: '' },
//     points:{type:Number, default:0}
//   },
//   { timestamps: true }
// );

// export default mongoose.model<IUser>('User', UserSchema);












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
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    googleId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true // Add index for faster lookups
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true, // Normalize email to lowercase
      trim: true,
      index: true // Add index for faster lookups
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
          return !v || /^https?:\/\//.test(v); // Validate URL format if provided
        },
        message: 'Avatar must be a valid URL'
      }
    },
    isAdmin: { 
      type: Boolean, 
      default: false,
      index: true // Add index for admin queries
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
      index: true // Add index for leaderboard queries
    }
  },
  { 
    timestamps: true,
    // Optimize queries by excluding version field by default
    versionKey: false,
    // Add compound index for common queries
    index: [
      { email: 1, googleId: 1 }, // For authentication queries
      { points: -1, createdAt: -1 } // For leaderboard queries
    ]
  }
);

// Add text index for search functionality (optional)
UserSchema.index({ 
  name: 'text', 
  bio: 'text' 
}, {
  name: 'user_search_index'
});

// Add pre-save middleware for data validation/cleaning
UserSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.email && typeof this.email==='string') {
    this.email = this.email.toLowerCase();
  }
  
  // Clean up name
  if (this.name && typeof this.name==='string') {
    this.name = this.name.trim();
  }
  
  // Clean up bio
  if (this.bio && typeof this.bio==='string') {
    this.bio = this.bio.trim();
  }
  
  next();
});

// Add static method for efficient user lookup
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

// Add instance method for safe user data export
UserSchema.methods.toSafeObject = function() {
  const userObject = this.toObject();
  delete userObject.__v;
  return userObject;
};

export default mongoose.model<IUser>('User', UserSchema);