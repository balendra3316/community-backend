












































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

    versionKey: false,

    index: [
      { email: 1, googleId: 1 }, // For authentication queries
      { points: -1, createdAt: -1 } // For leaderboard queries
    ]
  }
);


UserSchema.index({ 
  name: 'text', 
  bio: 'text' 
}, {
  name: 'user_search_index'
});


UserSchema.pre('save', function(next) {

  if (this.email && typeof this.email==='string') {
    this.email = this.email.toLowerCase();
  }
  

  if (this.name && typeof this.name==='string') {
    this.name = this.name.trim();
  }
  

  if (this.bio && typeof this.bio==='string') {
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

export default mongoose.model<IUser>('User', UserSchema);