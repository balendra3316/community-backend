


// routes/post.routes.ts

import express from 'express';
import { createPost, getPosts, getPost, likePost, votePoll, deletePost, getMyPosts, updatePost, getPostById } from '../controllers/post.controller';
import { protect } from '../middleware/auth.middleware';
import { uploadPostMedia } from '../middleware/upload.middleware'; // This import now brings the .fields() version

const router = express.Router();

// The 'upload' middleware now handles both 'image' and 'video' fields
router.post('/', protect, uploadPostMedia, createPost);

router.get('/', getPosts);
router.get('/me', protect, getMyPosts);
router.get('/:id', getPost);
router.get("/:id/details", getPostById);

router.put('/:id/like', protect, likePost);
router.put('/:id/vote', protect, votePoll);
// The 'upload' middleware now handles both 'image' and 'video' fields for updates too
router.put('/:id', protect, uploadPostMedia, updatePost);

router.delete('/:id', protect, deletePost);

export default router;
