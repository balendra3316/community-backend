

// src/controllers/post.controller.ts
import { Request, Response } from 'express';
import Post from '../models/Post.model';
import Comment from '../models/Comment.model';
import Notification from '../models/Notification.model';
import cloudinary from '../config/cloudinary';
import { createNotification } from '../utils/notification.util';
import { Types } from 'mongoose';
import { CustomRequest } from '../types/express/express';
import User from '../models/User.model'
import PointsHistory from '../models/PointsHistory.model';





export const updateUserPoints = async (
  userId: string,
  delta: number
): Promise<void> => {
  try {
    // Update the user's total points
    await User.findByIdAndUpdate(userId, { $inc: { points: delta } });
    
    // Record the points change in history
    await PointsHistory.create({
      userId,
      points: delta
    });
  } catch (error) {
    console.error('Failed to update user points:', error);
  }
};







// Create a new post
export const createPost = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { title, content, youtubeLink, tags, poll } = req.body;
    let image = '';

    if (req.file) {
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        { folder: 'community-posts' }
      );
      image = result.secure_url;
    }

    let pollData;
    if (poll) {
      const pollOptions = JSON.parse(poll);
      pollData = {
        options: pollOptions.map((option: string) => ({
          text: option,
          votes: [],
        })),
        voters: [],
      };
    }

    const post = new Post({
      author: req.user._id,
      title,
      content,
      image,
      youtubeLink,
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
      poll: pollData,
    });

    const savedPost = await post.save();
    setImmediate(() => {
      updateUserPoints(req.user!._id.toString(), 5);
    });
    const populatedPost = await Post.findById(savedPost._id).populate('author', 'name avatar');

    req.app.get('io').emit('newPost', populatedPost);
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all posts with pagination
export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name avatar')
      .lean();

    const total = await Post.countDocuments();

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single post with comments
export const getPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name avatar').lean();

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const comments = await Comment.find({ post: post._id, parent: null })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parent: comment._id })
          .populate('author', 'name avatar')
          .sort({ createdAt: 1 })
          .lean();
        return { ...comment, replies };
      })
    );

    res.json({ post, comments: commentsWithReplies });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Like or unlike a post
export const likePost = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const alreadyLiked = post.likes.includes(req.user._id);

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (like) => like.toString() !== req.user!._id.toString()
      );
      setImmediate(() => {
        updateUserPoints(post.author.toString(), -2);
      });
      
    } else {
      post.likes.push(req.user._id);
      setImmediate(() => {
        updateUserPoints(post.author.toString(), 2);
      });
      

      if (post.author.toString() !== req.user._id.toString()) {
        await createNotification({
          recipient: post.author,
          sender: req.user._id,
          type: 'like',
          post: post._id as Types.ObjectId,
        });

        req.app.get('io').to(post.author.toString()).emit('newNotification');
      }
    }

    await post.save();
    res.json({ liked: !alreadyLiked, likeCount: post.likes.length });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Vote on a poll
export const votePoll = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { optionIndex } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post || !post.poll) {
      res.status(404).json({ message: 'Post or poll not found' });
      return;
    }

    const alreadyVoted = post.poll.voters.includes(req.user._id.toString());
    if (alreadyVoted) {
      res.status(400).json({ message: 'You already voted' });
      return;
    }

    post.poll.options[optionIndex].votes.push(req.user._id.toString());
    post.poll.voters.push(req.user._id.toString());
    await post.save();

    const totalVotes = post.poll.voters.length;
    const results = post.poll.options.map((option) => ({
      text: option.text,
      votes: option.votes.length,
      percentage: Math.round((option.votes.length / totalVotes) * 100),
    }));

    res.json({ voted: true, results });
  } catch (error) {
    console.error('Vote poll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a post
export const deletePost = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });
    await Post.findByIdAndDelete(post._id);
    setImmediate(() => {
      updateUserPoints(post.author.toString(), -5);
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};






// Get logged-in user's own posts with pagination
export const getMyPosts = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = 5; // fixed to 5 per your request
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'name avatar')
      .lean();

    const total = await Post.countDocuments({ author: req.user._id });

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get my posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
