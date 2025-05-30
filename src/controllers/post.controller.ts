

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
import { emitNewNotification, emitUnreadCount } from '../services/notification.service';
import { BunnyStorageService } from '../services/bunnyStorage.service'; 
import { bunnyConfig } from '../config/bunnyStorage.config';





export const deleteImageFromBunnyStorage = async (imageUrl: string): Promise<void> => {
  try {
    if (imageUrl && imageUrl.includes(bunnyConfig.cdnUrl)) {
      const deleted = await BunnyStorageService.deleteFile(imageUrl);
      if (deleted) {
        console.log('Image deleted successfully from Bunny Storage:', imageUrl);
      } else {
        console.log('Failed to delete image from Bunny Storage:', imageUrl);
      }
    }
  } catch (error) {
    console.error('Error deleting image from Bunny Storage:', error);
  }
};



export const updateUserPoints = async (
  userId: string,
  delta: number
): Promise<void> => {
  try {
    if (delta < 0) {
      // For negative delta (subtracting points), ensure we don't go below zero
      const user = await User.findById(userId);
      if (!user) return;
      
      // Calculate how many points we can safely deduct
      const actualDelta = Math.max(-user.points, delta);
      
      // Update the user's points, ensuring they don't go below zero
      await User.findByIdAndUpdate(userId, { $inc: { points: actualDelta } });
      
      // Record the original negative delta in history (even if we couldn't deduct that much)
      await PointsHistory.create({
        userId,
        points: delta  // Store the original negative value for reporting purposes
      });
    } else {
      // For positive delta, just add points as normal
      await User.findByIdAndUpdate(userId, { $inc: { points: delta } });
      
      // Record the points change in history
      await PointsHistory.create({
        userId,
        points: delta
      });
    }
  } catch (error) {
    console.error('Failed to update user points:', error);
  }
};  




// // Create a new post
// export const createPost = async (req: CustomRequest, res: Response): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: 'Not authenticated' });
//       return;
//     }
//     const { title, content, youtubeLink, tags, poll } = req.body;
//     let image = '';
//     if (req.file) {
//       const result = await cloudinary.uploader.upload(
//         `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
//         { folder: 'community-posts' }
//       );
//       image = result.secure_url;
//     }
//     let pollData;
//     if (poll) {
//       const pollOptions = JSON.parse(poll);
//       pollData = {
//         options: pollOptions.map((option: string) => ({
//           text: option,
//           votes: [],
//         })),
//         voters: [],
//       };
//     }
//     const post = new Post({
//       author: req.user._id,
//       title,
//       content,
//       image,
//       youtubeLink,
//       tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
//       poll: pollData,
//     });
//     const savedPost = await post.save();
    
//     setImmediate(() => {
//       updateUserPoints(req.user!._id.toString(), 5);
//     });
    
//     const populatedPost = await Post.findById(savedPost._id).populate('author', 'name avatar');
    
//     // Emit to all users for general newPost event (existing functionality)
//     req.app.get('io').emit('newPost', populatedPost);
    
//     // Emit specific event to the post author only
//     req.app.get('io').to(req.user._id.toString()).emit('userPostCreated', {
//       post: populatedPost,
//       message: 'Your post has been created successfully'
//     });
    
//     res.status(201).json(populatedPost);
//   } catch (error) {
//     console.error('Create post error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };








// Updated post controller






// Create a new post
export const createPost = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { title, content, youtubeLink, tags, poll } = req.body;
    let image = '';

    // Handle image upload with Bunny Storage
    if (req.file) {
      try {
        image = await BunnyStorageService.uploadImage(
          req.file.buffer,
          req.file.originalname,
          'community-posts'
        );
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        res.status(500).json({ message: 'Image upload failed' });
        return;
      }
    }

    // Handle poll data
    let pollData;
    if (poll) {
      try {
        const pollOptions = JSON.parse(poll);
        pollData = {
          options: pollOptions.map((option: string) => ({
            text: option,
            votes: [],
          })),
          voters: [],
        };
      } catch (pollError) {
        console.error('Poll parsing error:', pollError);
        res.status(400).json({ message: 'Invalid poll data format' });
        return;
      }
    }

    // Create and save the post
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
    
    // Update user points asynchronously
    setImmediate(() => {
      updateUserPoints(req.user!._id.toString(), 5);
    });
    
    // Populate the post with author information
    const populatedPost = await Post.findById(savedPost._id).populate('author', 'name avatar');
    
    // Emit socket events
    req.app.get('io').emit('newPost', populatedPost);
    req.app.get('io').to(req.user._id.toString()).emit('userPostCreated', {
      post: populatedPost,
      message: 'Your post has been created successfully'
    });
    
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};













// Get all posts with pagination and filtering
export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const filter = req.query.filter as string || 'default'; // Can be 'default', 'oldNew', or 'popular'

    // Base query to find posts
    const baseQuery = Post.find();

    // Apply sorting based on filter
    if (filter === 'oldNew') {
      // For old-to-new, sort by creation date ascending but keep pinned posts at top
      baseQuery.sort({ isPinned: -1, createdAt: 1 });
    } else if (filter === 'popular') {
      // For popular posts, sort by likes/views but keep pinned posts at top
      baseQuery.sort({ isPinned: -1, likes: -1, views: -1, createdAt: -1 });
    } else {
      // Default: newest first (recent-to-old) with pinned posts at top
      baseQuery.sort({ isPinned: -1, createdAt: -1 });
    }

    // Apply pagination and populate author details
    const posts = await baseQuery
      .skip(skip)
      .limit(limit)
      .populate('author', 'name avatar')
      .lean();

    const total = await Post.countDocuments();

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      filter: filter,
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
      
      // Only send notification if it's not the user's own post
      if (post.author.toString() !== req.user._id.toString()) {
        // Check if a like notification already exists from this user for this post
        const existingNotification = await Notification.findOne({
          recipient: post.author,
          sender: req.user._id,
          type: 'like',
          post: post._id
        });
        
        if (!existingNotification) {
          // Create a new notification only if one doesn't already exist
          const notification = await createNotification({
            recipient: post.author,
            sender: req.user._id,
            type: 'like',
            post: post._id as Types.ObjectId,
          });

          // Emit the new notification (original code)
          req.app.get('io').to(post.author.toString()).emit('newNotification');
          
          // Get and emit the updated unread count with the correct event name and format
          const count = await Notification.countDocuments({
            recipient: post.author,
            read: false,
          });
          
          // This is the key change - emit with the event name and format the frontend expects
          req.app.get('io').to(post.author.toString()).emit('unreadCountUpdate', { count });
        }
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
    
    const post :any= await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    
    if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // Store image URL and author ID for background deletion
    const imageUrl = post.image;
    const authorId = post.author.toString();
    const postId = post._id.toString();
    
    // Delete from database first
    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });
    await Post.findByIdAndDelete(post._id);
    
    // Emit socket event to the post author only
    req.app.get('io').to(authorId).emit('postDeleted', { 
      postId: postId,
      message: 'Your post has been deleted successfully' 
    });
    
    // Send response immediately
    res.json({ message: 'Post deleted successfully' });
    
    // Handle background tasks
    setImmediate(() => {
      // Update user points
      updateUserPoints(authorId, -5);
      
      // Delete image from Cloudinary if exists
      if (imageUrl) {
        deleteImageFromBunnyStorage(imageUrl);
      }
    });
    
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












// Helper function to delete image from Cloudinary
const deleteImageFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    // Extract public_id from Cloudinary URL
    // Example URL: https://res.cloudinary.com/your-cloud/image/upload/v1234567890/community-posts/abc123.jpg
    const urlParts = imageUrl.split('/');
    const versionIndex = urlParts.findIndex(part => part.startsWith('v'));
    
    if (versionIndex !== -1 && versionIndex < urlParts.length - 1) {
      // Get everything after version (folder/filename)
      const pathAfterVersion = urlParts.slice(versionIndex + 1).join('/');
      // Remove file extension
      const publicId = pathAfterVersion.replace(/\.[^/.]+$/, '');
      
      await cloudinary.uploader.destroy(publicId);
      console.log(`Image deleted from Cloudinary: ${publicId}`);
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    // Don't throw error - this is background operation
  }
};