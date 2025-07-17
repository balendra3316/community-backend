

import express from 'express';
import { createPost, getPosts, getPost, likePost, votePoll, deletePost, getMyPosts, updatePost, getPostById } from '../controllers/post.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = express.Router();


router.post('/', protect, upload.single('image'), createPost);


router.get('/', getPosts);

router.get('/me', protect, getMyPosts);

router.get('/:id', getPost);


router.put('/:id/like', protect, likePost);


router.put('/:id/vote', protect, votePoll);
router.put('/:id', protect, upload.single('image'), updatePost);

router.delete('/:id', protect, deletePost);

router.get("/:id/details", getPostById);

export default router;