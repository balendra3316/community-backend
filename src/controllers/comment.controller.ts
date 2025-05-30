


// // src/controllers/comment.controller.ts
// import { Request, Response } from 'express';
// import Comment from '../models/Comment.model';
// import Post from '../models/Post.model';
// import { createNotification } from '../utils/notification.util';
// import cloudinary from '../config/cloudinary';
// import { Types } from 'mongoose';
// import Notification from '../models/Notification.model';
// import { updateUserPoints } from './post.controller';
// import User from '../models/User.model'
// import { emitNewNotification, emitUnreadCount } from '../services/notification.service';



// // Enhanced createComment controller
// export const createComment = async (req: Request, res: Response): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: 'Not authenticated' });
//       return;
//     }

//     const { content, youtubeLink, parentId } = req.body;
//     const postId = req.params.postId;

//     const post = await Post.findById(postId);
//     if (!post) {
//       res.status(404).json({ message: 'Post not found' });
//       return;
//     }

//     let image = '';
//     if (req.file) {
//       const result = await cloudinary.uploader.upload(
//         `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
//         { folder: 'community-comments' }
//       );
//       image = result.secure_url;
//     }

//     const comment = new Comment({
//       post: postId,
//       author: req.user._id,
//       content,
//       image,
//       youtubeLink,
//       parent: parentId || null,
//     });

//     const savedComment = await comment.save();

//     const isOwnPost = post.author.toString() === req.user!._id.toString();
//     if (!isOwnPost) {
//       setImmediate(() => {
//         updateUserPoints(req.user!._id.toString(), 3);
//       });
//     }
    
//     // Increment the totalComments count for the post
//     await Post.findByIdAndUpdate(postId, { $inc: { totalComments: 1 }, $set: { lastComment: new Date() } });
    
//     const populatedComment = await Comment.findById(savedComment._id)
//       .populate('author', 'name avatar')
//       .lean();

//     // Notification for post author
//     if (!parentId && post.author.toString() !== req.user._id.toString()) {
//       const notification = await createNotification({
//         recipient: post.author,
//         sender: req.user._id,
//         type: 'comment',
//         post: post._id as Types.ObjectId,
//         comment: savedComment._id as Types.ObjectId,
//       });

//       // Emit the new notification and unread count
//       emitNewNotification(req.app.get('io'), post.author, notification);
//       const count = await Notification.countDocuments({
//         recipient: post.author,
//         read: false,
//       });
//       emitUnreadCount(req.app.get('io'), post.author, count);
//     }

//     // Notification for parent comment author
//     if (parentId) {
//       const parentComment = await Comment.findById(parentId);
//       if (parentComment && parentComment.author.toString() !== req.user._id.toString()) {
//         const notification = await createNotification({
//           recipient: parentComment.author,
//           sender: req.user._id,
//           type: 'reply',
//           post: post._id as Types.ObjectId,
//           comment: savedComment._id as Types.ObjectId,
//         });

//         // Emit the new notification and unread count
//         emitNewNotification(req.app.get('io'), parentComment.author, notification);
//         const count = await Notification.countDocuments({
//           recipient: parentComment.author,
//           read: false,
//         });
//         emitUnreadCount(req.app.get('io'), parentComment.author, count);
//       }
//     }

//     // Emit socket event for real-time comment updates
//     // Include information about whether it's a direct comment or a reply
//     req.app.get('io').emit('newComment', {
//       postId,
//       comment: populatedComment,
//       isReply: !!parentId,
//       parentId: parentId || null,
//     });

//     res.status(201).json(populatedComment);
//   } catch (error) {
//     console.error('Create comment error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Enhanced deleteComment controller
// export const deleteComment = async (req: Request, res: Response): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: 'Not authenticated' });
//       return;
//     }

//     const comment = await Comment.findById(req.params.id);
//     if (!comment) {
//       res.status(404).json({ message: 'Comment not found' });
//       return;
//     }

//     if (comment.author.toString() !== req.user._id.toString()) {
//       res.status(403).json({ message: 'Unauthorized to delete this comment' });
//       return;
//     }

//     // Get the post ID and parent ID before deleting the comment
//     const postId = comment.post;
//     const parentId = comment.parent;
//     const commentId = comment._id;
    
//     await Comment.findByIdAndDelete(req.params.id);
    
//     // Check if it's a reply and handle accordingly
//     const isReply = !!parentId;

//     // Handle point reduction
//     const post = await Post.findById(comment.post);
//     const isOwnPost = post?.author.toString() === req.user!._id.toString();
//     if (!isOwnPost) {
//       setImmediate(() => updateUserPoints(req.user!._id.toString(), -3)); 
//     }
    
//     // Decrement the totalComments count for the post
//     await Post.findByIdAndUpdate(postId, { $inc: { totalComments: -1 } });
    
//     // Emit socket event for real-time comment deletion
//     req.app.get('io').emit('commentDeleted', {
//       postId,
//       commentId,
//       isReply,
//       parentId: parentId || null
//     });
    
//     res.json({ message: 'Comment deleted successfully' });
//   } catch (error) {
//     console.error('Delete comment error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };




// // Like or unlike a comment
// export const likeComment = async (req: Request, res: Response): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: 'Not authenticated' });
//       return;
//     }

//     const comment = await Comment.findById(req.params.id);
//     if (!comment) {
//       res.status(404).json({ message: 'Comment not found' });
//       return;
//     }

//     const alreadyLiked = comment.likes.includes(req.user._id);
//     if (alreadyLiked) {
//       comment.likes = comment.likes.filter(
//         (like) => like.toString() !== req.user!._id.toString()
//       );
//     } else {
//       comment.likes.push(req.user._id);
//       if (comment.author.toString() !== req.user._id.toString()) {
//         await createNotification({
//           recipient: comment.author,
//           sender: req.user._id,
//           type: 'like',
//           post: comment.post,
//           comment: comment._id as Types.ObjectId,
//         });

//         req.app.get('io').to(comment.author.toString()).emit('newNotification');
//       }
//     }

//     await comment.save();
//     const likeCount = comment.likes.length;

//     res.json({ liked: !alreadyLiked, likeCount });
//   } catch (error) {
//     console.error('Like comment error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };



// const getAllDescendants = async (parentId: string): Promise<any[]> => {
//   const queue = [parentId];
//   const allReplies: any[] = [];

//   while (queue.length > 0) {
//     const currentParent = queue.shift();
//     const children = await Comment.find({ parent: currentParent })
//       .sort({ createdAt: 1 })
//       .populate('author', 'name avatar')
//       .lean();

//     allReplies.push(...children);
//     queue.push(...children.map(child => child._id.toString()));
//   }

//   return allReplies;
// };

// export const getCommentsByPost = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { postId } = req.params;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = 5;
//     const skip = (page - 1) * limit;

//     const post = await Post.findById(postId);
//     if (!post) {
//       res.status(404).json({ message: 'Post not found' });
//       return;
//     }

//     const topLevelComments = await Comment.find({ post: postId, parent: null })
//       .sort({ createdAt: 1 })
//       .skip(skip)
//       .limit(limit)
//       .populate('author', 'name avatar')
//       .lean();

//     const commentsWithReplies = await Promise.all(
//       topLevelComments.map(async (comment) => {
//         const allReplies = await getAllDescendants(comment._id.toString());
//         return { ...comment, replies: allReplies };
//       })
//     );

//     const totalCount = await Comment.countDocuments({ post: postId, parent: null });

//     res.json({
//       comments: commentsWithReplies,
//       page,
//       totalPages: Math.ceil(totalCount / limit),
//       totalCount,
//     });
//   } catch (error) {
//     console.error('Get comments error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };












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
import { emitNewNotification, emitUnreadCount } from '../services/notification.service';

// Enhanced createComment controller
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

    const isOwnPost = post.author.toString() === req.user!._id.toString();
    if (!isOwnPost) {
      setImmediate(() => {
        updateUserPoints(req.user!._id.toString(), 3);
      });
    }
    
    // Increment the totalComments count for the post
    await Post.findByIdAndUpdate(postId, { $inc: { totalComments: 1 }, $set: { lastComment: new Date() } });
    
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('author', 'name avatar')
      .lean();

    // Batch notification processing
    const notifications = [];
    const notificationEmissions = [];

    // Notification for post author
    if (!parentId && post.author.toString() !== req.user._id.toString()) {
      const notification = await createNotification({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        post: post._id as Types.ObjectId,
        comment: savedComment._id as Types.ObjectId,
      });

      notificationEmissions.push({
        recipient: post.author,
        notification,
      });
    }

    // Notification for parent comment author
    if (parentId) {
      const parentComment = await Comment.findById(parentId).select('author').lean();
      if (parentComment && parentComment.author.toString() !== req.user._id.toString()) {
        const notification = await createNotification({
          recipient: parentComment.author,
          sender: req.user._id,
          type: 'reply',
          post: post._id as Types.ObjectId,
          comment: savedComment._id as Types.ObjectId,
        });

        notificationEmissions.push({
          recipient: parentComment.author,
          notification,
        });
      }
    }

    // Batch emit notifications
    for (const emission of notificationEmissions) {
      emitNewNotification(req.app.get('io'), emission.recipient, emission.notification);
      const count = await Notification.countDocuments({
        recipient: emission.recipient,
        read: false,
      });
      emitUnreadCount(req.app.get('io'), emission.recipient, count);
    }

    // Emit socket event for real-time comment updates
    req.app.get('io').emit('newComment', {
      postId,
      comment: populatedComment,
      isReply: !!parentId,
      parentId: parentId || null,
    });

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Enhanced deleteComment controller
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

    // Get the post ID and parent ID before deleting the comment
    const postId = comment.post;
    const parentId = comment.parent;
    const commentId = comment._id;
    
    await Comment.findByIdAndDelete(req.params.id);
    
    // Check if it's a reply and handle accordingly
    const isReply = !!parentId;

    // Handle point reduction
    const post = await Post.findById(comment.post);
    const isOwnPost = post?.author.toString() === req.user!._id.toString();
    if (!isOwnPost) {
      setImmediate(() => updateUserPoints(req.user!._id.toString(), -3)); 
    }
    
    // Decrement the totalComments count for the post
    await Post.findByIdAndUpdate(postId, { $inc: { totalComments: -1 } });
    
    // Emit socket event for real-time comment deletion
    req.app.get('io').emit('commentDeleted', {
      postId,
      commentId,
      isReply,
      parentId: parentId || null
    });
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
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

// OPTIMIZED: Single query to get all replies with proper nesting
const buildCommentTree = (comments: any[]): any[] => {
  const commentMap = new Map();
  const rootComments: any[] = [];

  // First pass: create map and initialize replies array
  comments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment._id.toString(), comment);
  });

  // Second pass: build tree structure
  comments.forEach(comment => {
    if (comment.parent) {
      const parent = commentMap.get(comment.parent.toString());
      if (parent) {
        parent.replies.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  return rootComments;
};

// OPTIMIZED: Get comments with single query instead of recursive calls
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

    // Get total count of top-level comments
    const totalCount = await Comment.countDocuments({ post: postId, parent: null });

    // Get top-level comments with pagination
    const topLevelComments = await Comment.find({ post: postId, parent: null })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .select('_id')
      .lean();

    if (topLevelComments.length === 0) {
      res.json({
        comments: [],
        page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      });
      return;
    }

    const topLevelIds = topLevelComments.map(c => c._id);

    // OPTIMIZED: Single aggregation to get all comments and their nested replies
    const allComments = await Comment.aggregate([
      {
        $match: {
          post: new Types.ObjectId(postId),
          $or: [
            { _id: { $in: topLevelIds } }, // Top-level comments
            { parent: { $exists: true } } // All replies (we'll filter later)
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [{ $project: { name: 1, avatar: 1 } }]
        }
      },
      {
        $unwind: '$author'
      },
      {
        $sort: { createdAt: 1 }
      }
    ]);

    // Filter to only include replies that belong to our top-level comments
    const topLevelIdsSet = new Set(topLevelIds.map(id => id.toString()));
    
    // Build a map to track comment ancestry
    const getCommentAncestry = (comments: any[], commentId: string, visited = new Set()): boolean => {
      if (visited.has(commentId)) return false; // Prevent infinite loops
      visited.add(commentId);
      
      const comment = comments.find(c => c._id.toString() === commentId);
      if (!comment) return false;
      
      if (!comment.parent) {
        return topLevelIdsSet.has(commentId);
      }
      
      return getCommentAncestry(comments, comment.parent.toString(), visited);
    };

    // Filter comments to only include those that belong to our paginated top-level comments
    const relevantComments = allComments.filter(comment => {
      const commentId = comment._id.toString();
      return topLevelIdsSet.has(commentId) || getCommentAncestry(allComments, commentId);
    });

    // Build the comment tree
    const commentsWithReplies = buildCommentTree(relevantComments);

    // Sort top-level comments to maintain the original order
    const sortedComments = topLevelIds.map(id => 
      commentsWithReplies.find(c => c._id.toString() === id.toString())
    ).filter(Boolean);

    res.json({
      comments: sortedComments,
      page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};