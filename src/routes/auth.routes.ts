import express from "express";
import {
  getGoogleAuthURL,
  googleCallback,
  getCurrentUser,
  logout,
  updateProfile,
} from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.get("/google/url", getGoogleAuthURL);

router.get("/google/callback", googleCallback);

router.get("/me", protect, getCurrentUser);

router.post("/logout", logout);

router.put("/profile", protect, upload.single("avatar"), updateProfile);

export default router;
