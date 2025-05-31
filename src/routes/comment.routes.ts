
import express from "express";
import {
  createComment,
  likeComment,
  deleteComment,
  getCommentsByPost,
} from "../controllers/comment.controller";
import { protect } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = express.Router();

router.get("/:postId", getCommentsByPost);

router.post("/:postId", protect, upload.single("image"), createComment);

router.put("/:id/like", protect, likeComment);

router.delete("/:id", protect, deleteComment);

export default router;
