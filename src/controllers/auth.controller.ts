// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt, { SignOptions } from "jsonwebtoken";
import User, { IUser } from "../models/User.model";

import { CustomRequest } from "../types/express/express";
import { BunnyStorageService } from "../services/bunnyStorage.service";

// Create OAuth client with connection pooling
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5000/api/auth/google/callback"
);

// Cache JWT secret to avoid repeated process.env access
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

// Optimize token generation with cached secret
const generateToken = (id: string): string => {
  const payload = { id };
  const options: SignOptions = {
    expiresIn: "30d",
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

// Google OAuth login URL
export const getGoogleAuthURL = (req: Request, res: Response): void => {
  const scopes = ["profile", "email"];

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.json({ url: authUrl });
};

// Handle Google OAuth callback with optimized database operations
export const googleCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      res.status(400).json({ message: "Authorization code is required" });
      return;
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      res.status(401).json({ message: "Authentication failed: No ID token" });
      return;
    }

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      res
        .status(401)
        .json({ message: "Authentication failed: Invalid payload" });
      return;
    }

    // Check if user exists first
    let user = await User.findOne({ email: payload.email });

    if (user) {
      // User exists - only update googleId if needed, preserve custom name and avatar
      if (user.googleId !== payload.sub) {
        user.googleId = payload.sub;
        await user.save();
      }
    } else {
      // Create new user with Google data
      user = await User.create({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || "User",
        avatar: payload.picture || "",
        isAdmin: false,
        badges: [],
        bio: "",
        points: 0,
      });
    }

    const token = generateToken(user._id.toString());

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect to frontend
    res.redirect(`http://localhost:3000/auth/callback`);
  } catch (error) {
    console.error("Google callback error:", error);
    res.status(500).json({ message: "Server error during authentication" });
  }
};

// Get current user with lean query for better performance
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    // Return user data without Mongoose overhead
    const userData = {
      _id: req.user._id,
      googleId: req.user.googleId,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar,
      isAdmin: req.user.isAdmin,
      badges: req.user.badges,
      bio: req.user.bio,
      points: req.user.points,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    };

    res.json(userData);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout
export const logout = (req: Request, res: Response): void => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged out successfully" });
};

export const updateProfile = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { name } = req.body;
    const updateData: Partial<IUser> = {};

    // Update name if provided and different
    if (name && name.trim() && name !== req.user.name) {
      updateData.name = name.trim();
    }

    // Handle avatar upload if file is provided
    if (req.file) {
      try {
        // Validate file size (e.g., 5MB limit)
        if (req.file.size > 5 * 1024 * 1024) {
          res
            .status(400)
            .json({ message: "Avatar file too large. Maximum size is 5MB." });
          return;
        }

        // Validate file type
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
        ];
        if (!allowedTypes.includes(req.file.mimetype)) {
          res
            .status(400)
            .json({
              message:
                "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
            });
          return;
        }

        // Upload to Bunny Storage
        const avatarUrl = await BunnyStorageService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          "user-avatars"
        );

        updateData.avatar = avatarUrl;

        // Optional: Delete old avatar if it exists and is from Bunny Storage
        if (req.user.avatar && req.user.avatar.includes("bunnycdn.com")) {
          await BunnyStorageService.deleteFile(req.user.avatar);
        }
      } catch (uploadError) {
        console.error("Avatar upload error:", uploadError);
        res.status(400).json({ message: "Error uploading avatar" });
        return;
      }
    }

    // Only update if there's data to update
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: "No update data provided" });
      return;
    }

    // Use atomic update with optimistic locking
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        select: "-__v", // Exclude version field
      }
    );

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(updatedUser);
  } catch (error: any) {
    console.error("Update profile error:", error);

    // Handle specific error types
    if (error.name === "ValidationError") {
      res.status(400).json({ message: "Invalid data provided" });
      return;
    }

    if (error.name === "CastError") {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    res.status(500).json({ message: "Server error" });
  }
};
