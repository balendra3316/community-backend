


// src/controllers/comment.controller.ts
import { Request, Response } from 'express';
import Comment from '../models/Comment.model';
import Post from '../models/Post.model';
import { createNotification } from '../utils/notification.util';
import cloudinary from '../config/cloudinary';
import { Types } from 'mongoose';
import Notification from '../models/Notification.model';
import { updateUserPoints } from './post.controller';
import User from '../models/User.model'



// Create a new comment
export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { content, youtubeLink, parentId } = req.body;
    const postId = req.params.postId;

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    let image = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        { folder: 'community-comments' }
      );
      image = result.secure_url;
    }

    const comment = new Comment({
      post: postId,
      author: req.user._id,
      content,
      image,
      youtubeLink,
      parent: parentId || null,
    });

    const savedComment = await comment.save();

    const isOwnPost = post.author._id .toString() === req.user!._id.toString();
 if(! isOwnPost){
    setImmediate(() => {
      updateUserPoints(req.user!._id.toString(), 3);
    });
  }
    
    
    // Increment the totalComments count for the post
    await Post.findByIdAndUpdate(postId, { $inc: { totalComments: 1 } });
    
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('author', 'name avatar')
      .lean();

    // Notification for post author
    if (!parentId && post.author.toString() !== req.user._id.toString()) {
      await createNotification({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        post: post._id as Types.ObjectId,
        comment: savedComment._id as Types.ObjectId,
      });

      req.app.get('io').to(post.author.toString()).emit('newNotification');
    }

    // Notification for parent comment author
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (parentComment && parentComment.author.toString() !== req.user._id.toString()) {
        await createNotification({
          recipient: parentComment.author,
          sender: req.user._id,
          type: 'reply',
          post: post._id as Types.ObjectId,
          comment: savedComment._id as Types.ObjectId,
        });

        req.app.get('io').to(parentComment.author.toString()).emit('newNotification');
      }
    }

    req.app.get('io').emit('newComment', {
      postId,
      comment: populatedComment,
      parentId,
    });

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Like or unlike a comment
export const likeComment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    const alreadyLiked = comment.likes.includes(req.user._id);
    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (like) => like.toString() !== req.user!._id.toString()
      );
    } else {
      comment.likes.push(req.user._id);
      if (comment.author.toString() !== req.user._id.toString()) {
        await createNotification({
          recipient: comment.author,
          sender: req.user._id,
          type: 'like',
          post: comment.post,
          comment: comment._id as Types.ObjectId,
        });

        req.app.get('io').to(comment.author.toString()).emit('newNotification');
      }
    }

    await comment.save();
    const likeCount = comment.likes.length;

    res.json({ liked: !alreadyLiked, likeCount });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a comment
export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Unauthorized to delete this comment' });
      return;
    }

    // Get the post ID before deleting the comment
    const postId = comment.post;
    
    await Comment.findByIdAndDelete(req.params.id);
  


    const post = await Post.findById(comment.post._id);
const isOwnPost = post?.author.toString() === req.user!._id.toString();
if (!isOwnPost) {
  setImmediate(() => updateUserPoints(req.user!._id.toString(), -3)); 
}
    
    
    // Decrement the totalComments count for the post
    await Post.findByIdAndUpdate(postId, { $inc: { totalComments: -1 } });
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllDescendants = async (parentId: string): Promise<any[]> => {
  const queue = [parentId];
  const allReplies: any[] = [];

  while (queue.length > 0) {
    const currentParent = queue.shift();
    const children = await Comment.find({ parent: currentParent })
      .sort({ createdAt: 1 })
      .populate('author', 'name avatar')
      .lean();

    allReplies.push(...children);
    queue.push(...children.map(child => child._id.toString()));
  }

  return allReplies;
};

export const getCommentsByPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const topLevelComments = await Comment.find({ post: postId, parent: null })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name avatar')
      .lean();

    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        const allReplies = await getAllDescendants(comment._id.toString());
        return { ...comment, replies: allReplies };
      })
    );

    const totalCount = await Comment.countDocuments({ post: postId, parent: null });

    res.json({
      comments: commentsWithReplies,
      page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};