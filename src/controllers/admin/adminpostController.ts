import { Request, Response, NextFunction } from 'express';
import Post from '../../models/Post.model';
import mongoose from 'mongoose';

export const deletePostByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    await post.deleteOne();

    res.json({ message: 'Post removed successfully' });
  } catch (error) {
    
    if (error instanceof mongoose.Error.CastError) {
      res.status(400).json({ message: 'Invalid post ID format' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @description Toggle the isPinned status of a post (Admin only)
 * @route PATCH /api/admin/posts/:postId/toggle-pin
 * @access Private/Admin
 */
export const togglePinPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.json({ 
      message: `Post has been ${post.isPinned ? 'pinned' : 'unpinned'}.`,
      post 
    });
  } catch (error) {
    
    if (error instanceof mongoose.Error.CastError) {
      res.status(400).json({ message: 'Invalid post ID format' });
      return;
    }
    res.status(500).json({ message: 'Server error' });
  }
};