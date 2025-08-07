
import { Request, Response } from "express";
import Comment from "../models/Comment.model";
import Post from "../models/Post.model";
import { createNotification } from "../utils/notification.util";
import cloudinary from "../config/cloudinary";
import { Types } from "mongoose";
import Notification from "../models/Notification.model";
import { updateUserPoints } from "./post.controller";
import User from "../models/User.model";
import {
  emitNewNotification,
  emitUnreadCount,
} from "../services/notification.service";


export const createComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { content, youtubeLink, parentId } = req.body;
    const postId = req.params.postId;

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }










    const comment = new Comment({
      post: postId,
      author: req.user._id,
      content,
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


    await Post.findByIdAndUpdate(postId, {
      $inc: { totalComments: 1 },
      $set: { lastComment: new Date() },
    });

    const populatedComment = await Comment.findById(savedComment._id)
      .populate("author", "name avatar")
      .lean();


    const notifications = [];
    const notificationEmissions = [];


    if (!parentId && post.author.toString() !== req.user._id.toString()) {
      const notification = await createNotification({
        recipient: post.author,
        sender: req.user._id,
        type: "comment",
        post: post._id as Types.ObjectId,
        comment: savedComment._id as Types.ObjectId,
      });

      notificationEmissions.push({
        recipient: post.author,
        notification,
      });
    }


    if (parentId) {
      const parentComment = await Comment.findById(parentId)
        .select("author")
        .lean();
      if (
        parentComment &&
        parentComment.author.toString() !== req.user._id.toString()
      ) {
        const notification = await createNotification({
          recipient: parentComment.author,
          sender: req.user._id,
          type: "reply",
          post: post._id as Types.ObjectId,
          comment: savedComment._id as Types.ObjectId,
        });

        notificationEmissions.push({
          recipient: parentComment.author,
          notification,
        });
      }
    }


    for (const emission of notificationEmissions) {
      emitNewNotification(
        req.app.get("io"),
        emission.recipient,
        emission.notification
      );
      const count = await Notification.countDocuments({
        recipient: emission.recipient,
        read: false,
      });
      emitUnreadCount(req.app.get("io"), emission.recipient, count);
    }


    req.app.get("io").emit("newComment", {
      postId,
      comment: populatedComment,
      isReply: !!parentId,
      parentId: parentId || null,
    });

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};




export const deleteComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: "Unauthorized to delete this comment" });
      return;
    }


    const postId = comment.post;
    const parentId = comment.parent;
    const commentId = comment._id;

    await Comment.findByIdAndDelete(req.params.id);


    const isReply = !!parentId;


    const post = await Post.findById(comment.post);
    const isOwnPost = post?.author.toString() === req.user!._id.toString();
    if (!isOwnPost) {
      setImmediate(() => updateUserPoints(req.user!._id.toString(), -3));
    }


    await Post.findByIdAndUpdate(postId, { $inc: { totalComments: -1 } });


    req.app.get("io").emit("commentDeleted", {
      postId,
      commentId,
      isReply,
      parentId: parentId || null,
    });

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const likeComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      res.status(404).json({ message: "Comment not found" });
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
          type: "like",
          post: comment.post,
          comment: comment._id as Types.ObjectId,
        });

        req.app.get("io").to(comment.author.toString()).emit("newNotification");
      }
    }

    await comment.save();
    const likeCount = comment.likes.length;

    res.json({ liked: !alreadyLiked, likeCount });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


const buildCommentTree = (comments: any[]): any[] => {
  const commentMap = new Map();
  const rootComments: any[] = [];


  comments.forEach((comment) => {
    comment.replies = [];
    commentMap.set(comment._id.toString(), comment);
  });


  comments.forEach((comment) => {
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


export const getCommentsByPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }


    const totalCount = await Comment.countDocuments({
      post: postId,
      parent: null,
    });


    const topLevelComments = await Comment.find({ post: postId, parent: null })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .select("_id")
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

    const topLevelIds = topLevelComments.map((c) => c._id);


    const allComments = await Comment.aggregate([
      {
        $match: {
          post: new Types.ObjectId(postId),
          $or: [
            { _id: { $in: topLevelIds } }, // Top-level comments
            { parent: { $exists: true } }, // All replies (we'll filter later)
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
          pipeline: [{ $project: { name: 1, avatar: 1 } }],
        },
      },
      {
        $unwind: "$author",
      },
      {
        $sort: { createdAt: 1 },
      },
    ]);


    const topLevelIdsSet = new Set(topLevelIds.map((id) => id.toString()));


    const getCommentAncestry = (
      comments: any[],
      commentId: string,
      visited = new Set()
    ): boolean => {
      if (visited.has(commentId)) return false; // Prevent infinite loops
      visited.add(commentId);

      const comment = comments.find((c) => c._id.toString() === commentId);
      if (!comment) return false;

      if (!comment.parent) {
        return topLevelIdsSet.has(commentId);
      }

      return getCommentAncestry(comments, comment.parent.toString(), visited);
    };


    const relevantComments = allComments.filter((comment) => {
      const commentId = comment._id.toString();
      return (
        topLevelIdsSet.has(commentId) ||
        getCommentAncestry(allComments, commentId)
      );
    });


    const commentsWithReplies = buildCommentTree(relevantComments);


    const sortedComments = topLevelIds
      .map((id) =>
        commentsWithReplies.find((c) => c._id.toString() === id.toString())
      )
      .filter(Boolean);

    res.json({
      comments: sortedComments,
      page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
