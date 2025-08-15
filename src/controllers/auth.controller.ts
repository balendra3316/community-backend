
import { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt, { SignOptions } from "jsonwebtoken";
import User, { IUser } from "../models/User.model";

import { CustomRequest } from "../types/express/express";
import { BunnyStorageService } from "../services/bunnyStorage.service";


const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}


const generateToken = (id: string): string => {
  const payload = { id };
  const options: SignOptions = {
    expiresIn: "30d",
  };
  return jwt.sign(payload, JWT_SECRET, options);
};


export const getGoogleAuthURL = (req: Request, res: Response): void => {
  const scopes = ["profile", "email"];

  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.json({ url: authUrl });
};


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


    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      res.status(401).json({ message: "Authentication failed: No ID token" });
      return;
    }


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


    let user = await User.findOne({ email: payload.email });

    if (user) {

      if (user.googleId !== payload.sub) {
        user.googleId = payload.sub;
        await user.save();
      }
    } else {

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


   res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
  } catch (error) {
    res.status(500).json({ message: "Server error during authentication" });
  }
};


export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }


    // const userData = {
    //   _id: req.user._id,
    //   googleId: req.user.googleId,
    //   email: req.user.email,
    //   name: req.user.name,
    //   avatar: req.user.avatar,
    //   isAdmin: req.user.isAdmin,
    //   badges: req.user.badges,
    //   bio: req.user.bio,
    //   points: req.user.points,
    //   createdAt: req.user.createdAt,
    //   updatedAt: req.user.updatedAt,
    // };

    // res.json(userData);



    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const logout = (req: Request, res: Response): void => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged out successfully" });
};







// export const updateProfile = async (
//   req: CustomRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: "Not authenticated" });
//       return;
//     }

//     const { name } = req.body;
//     const updateData: Partial<IUser> = {};


//     if (name && name.trim() && name !== req.user.name) {
//       updateData.name = name.trim();
//     }


//     if (req.file) {
//       try {

//         if (req.file.size > 20 * 1024 * 1024) {
//           res
//             .status(400)
//             .json({ message: "Avatar file too large. Maximum size is 5MB." });
//           return;
//         }


//         const allowedTypes = [
//           "image/jpeg",
//           "image/png",
//           "image/jpg",
//           "image/webp",
//         ];
//         if (!allowedTypes.includes(req.file.mimetype)) {
//           res
//             .status(400)
//             .json({
//               message:
//                 "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
//             });
//           return;
//         }


//         const avatarUrl = await BunnyStorageService.uploadImage(
//           req.file.buffer,
//           req.file.originalname,
//           "user-avatars"
//         );

//         updateData.avatar = avatarUrl;


//         if (req.user.avatar && req.user.avatar.includes("bunnycdn.com")) {
//           await BunnyStorageService.deleteFile(req.user.avatar);
//         }
//       } catch (uploadError) {
//         res.status(400).json({ message: "Error uploading avatar" });
//         return;
//       }
//     }


//     if (Object.keys(updateData).length === 0) {
//       res.status(400).json({ message: "No update data provided" });
//       return;
//     }


//     const updatedUser = await User.findByIdAndUpdate(
//       req.user._id,
//       { $set: updateData },
//       {
//         new: true,
//         runValidators: true,
//         select: "-__v", // Exclude version field
//       }
//     );

//     if (!updatedUser) {
//       res.status(404).json({ message: "User not found" });
//       return;
//     }

//     res.json(updatedUser);
//   } catch (error: any) {
//     if (error.name === "ValidationError") {
//       res.status(400).json({ message: "Invalid data provided" });
//       return;
//     }

//     if (error.name === "CastError") {
//       res.status(400).json({ message: "Invalid user ID" });
//       return;
//     }

//     res.status(500).json({ message: "Server error" });
//   }
// };















export const updateProfile = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { 
        name, dob, city, bloodGroup, whatsappNumber, 
        goals, acdStarClubRegisterDate, height, weight 
    } = req.body;
      
    const updateData: Partial<IUser> = {};

    // --- EXISTING NAME UPDATE ---
    if (name && name.trim() && name !== req.user.name) {
      updateData.name = name.trim();
    }

    // --- HANDLE NEW FIELDS ---
    if (dob) updateData.dob = new Date(dob);
    if (city) updateData.city = city;
    if (bloodGroup) updateData.bloodGroup = bloodGroup;
    if (whatsappNumber) updateData.whatsappNumber = whatsappNumber;
    if (goals) updateData.goals = goals;
    if (acdStarClubRegisterDate) updateData.acdStarClubRegisterDate = new Date(acdStarClubRegisterDate);
    if (height) updateData.height = Number(height);
    if (weight) updateData.weight = Number(weight);


    // --- MEMBERSHIP ID LOGIC ---
    if (!req.user.membershipId) {
        let newMembershipId;
        let isUnique = false;
        // Loop to ensure the generated ID is truly unique
        do {
            newMembershipId = 'ACD' + Math.floor(10000 + Math.random() * 90000);
            const existingUser = await User.findOne({ membershipId: newMembershipId });
            if (!existingUser) {
                isUnique = true;
            }
        } while (!isUnique);
        updateData.membershipId = newMembershipId;
    }

    // --- EXISTING AVATAR UPLOAD (Unchanged) ---
    if (req.file) {
      try {
        if (req.file.size > 20 * 1024 * 1024) { // 20MB limit
          res.status(400).json({ message: "Avatar file too large. Maximum size is 20MB." });
          return;
        }
        // ... (rest of the file upload logic is unchanged)
        const avatarUrl = await BunnyStorageService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          "user-avatars"
        );
        updateData.avatar = avatarUrl;
        if (req.user.avatar && req.user.avatar.includes("bunnycdn.com")) {
          await BunnyStorageService.deleteFile(req.user.avatar);
        }
      } catch (uploadError) {
        res.status(400).json({ message: "Error uploading avatar" });
        return;
      }
    }

    if (Object.keys(updateData).length === 0 && !req.file) {
      // If only a file was sent, updateData would be empty, which is fine.
      // But if no file AND no data, then it's a bad request.
      res.status(400).json({ message: "No update data provided" });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true, select: "-__v" }
    );

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(updatedUser);
  } catch (error: any) {
    if (error.name === "ValidationError") {
      res.status(400).json({ message: "Invalid data provided: " + error.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};
