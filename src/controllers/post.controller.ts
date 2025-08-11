import { Request, Response } from "express";
import Post from "../models/Post.model";
import Comment from "../models/Comment.model";
import Notification from "../models/Notification.model";
import cloudinary from "../config/cloudinary";
import { createNotification } from "../utils/notification.util";
import { Types } from "mongoose";
import { CustomRequest } from "../types/express/express";
import User from "../models/User.model";
import PointsHistory from "../models/PointsHistory.model";
import {
  emitNewNotification,
  emitUnreadCount,
} from "../services/notification.service";
import { BunnyStorageService } from "../services/bunnyStorage.service";
import { BunnyStreamService } from "../services/bunnyStream.service";
import { bunnyConfig } from "../config/bunnyStorage.config";

export const deleteImageFromBunnyStorage = async (
  imageUrl: string
): Promise<void> => {
  try {
    if (
      imageUrl &&
      bunnyConfig.cdnUrl &&
      imageUrl.includes(bunnyConfig.cdnUrl)
    ) {
      const deleted = await BunnyStorageService.deleteFile(imageUrl);
      if (deleted) {
      } else {
      }
    }
  } catch (error) {}
};

export const updateUserPoints = async (
  userId: string,
  delta: number
): Promise<void> => {
  try {
    if (delta < 0) {
      const user = await User.findById(userId);
      if (!user) return;

      const actualDelta = Math.max(-user.points, delta);

      await User.findByIdAndUpdate(userId, { $inc: { points: actualDelta } });

      await PointsHistory.create({
        userId,
        points: delta, // Store the original negative 
      });
    } else {
      await User.findByIdAndUpdate(userId, { $inc: { points: delta } });

      await PointsHistory.create({
        userId,
        points: delta,
      });
    }
  } catch (error) {}
};




// export const createPost = async (
//   req: CustomRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: "Not authenticated" });
//       return;
//     }

//     const { title, content, youtubeLink, tags, poll, links } = req.body; 
//     let image = "";

//     if (req.file) {
//       try {
//         image = await BunnyStorageService.uploadImage(
//           req.file.buffer,
//           req.file.originalname,
//           "community-posts"
//         );
//       } catch (uploadError) {
//         res.status(500).json({ message: "Image upload failed" });
//         return;
//       }
//     }

//     let pollData;
//     if (poll) {
//       try {
//         const pollOptions = JSON.parse(poll);
//         pollData = {
//           options: pollOptions.map((option: string) => ({
//             text: option,
//             votes: [],
//           })),
//           voters: [],
//         };
//       } catch (pollError) {
//         res.status(400).json({ message: "Invalid poll data format" });
//         return;
//       }
//     }

//     const post = new Post({
//       author: req.user._id,
//       title,
//       content,
//       image,
//       youtubeLink,
//       links: links ? links.split(",").map((link: string) => link.trim()) : [], // Added this line
//       tags: tags ? tags.split(",").map((tag: string) => tag.trim()) : [],
//       poll: pollData,
//     });

//     const savedPost = await post.save();

//     setImmediate(() => {
//       updateUserPoints(req.user!._id.toString(), 5);
//     });

//     const populatedPost = await Post.findById(savedPost._id).populate(
//       "author",
//       "name avatar"
//     );

//     // req.app.get("io").emit("newPost", populatedPost);
//     req.app.get("io").to(req.user._id.toString()).emit("postCreated", {
//       post: populatedPost,
//       message: "Your post has been created successfully",
//     });

//     res.status(201).json(populatedPost);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const filter = (req.query.filter as string) || "default"; // Can be 'default', 'oldNew', or 'popular'

    const baseQuery = Post.find();

    if (filter === "oldNew") {
      baseQuery.sort({ isPinned: -1, createdAt: 1 });
    } else if (filter === "popular") {
      baseQuery.sort({ isPinned: -1, likes: -1, views: -1, createdAt: -1 });
    } else {
      baseQuery.sort({ isPinned: -1, createdAt: -1 });
    }

    const posts = await baseQuery
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .lean();

    const total = await Post.countDocuments();

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      filter: filter,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name avatar")
      .lean();

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const comments = await Comment.find({ post: post._id, parent: null })
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parent: comment._id })
          .populate("author", "name avatar")
          .sort({ createdAt: 1 })
          .lean();
        return { ...comment, replies };
      })
    );

    res.json({ post, comments: commentsWithReplies });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const likePost = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
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
        const existingNotification = await Notification.findOne({
          recipient: post.author,
          sender: req.user._id,
          type: "like",
          post: post._id,
        });

        if (!existingNotification) {
          const notification = await createNotification({
            recipient: post.author,
            sender: req.user._id,
            type: "like",
            post: post._id as Types.ObjectId,
          });

          req.app.get("io").to(post.author.toString()).emit("newNotification");

          const count = await Notification.countDocuments({
            recipient: post.author,
            read: false,
          });

          req.app
            .get("io")
            .to(post.author.toString())
            .emit("unreadCountUpdate", { count });
        }
      }
    }

    await post.save();
    res.json({ liked: !alreadyLiked, likeCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const votePoll = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const { optionIndex } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post || !post.poll) {
      res.status(404).json({ message: "Post or poll not found" });
      return;
    }

    const alreadyVoted = post.poll.voters.includes(req.user._id.toString());
    if (alreadyVoted) {
      res.status(400).json({ message: "You already voted" });
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
    res.status(500).json({ message: "Server error" });
  }
};

// export const deletePost = async (
//   req: CustomRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: "Not authenticated" });
//       return;
//     }

//     const post: any = await Post.findById(req.params.id);
//     if (!post) {
//       res.status(404).json({ message: "Post not found" });
//       return;
//     }

//     if (
//       post.author.toString() !== req.user._id.toString() &&
//       !req.user.isAdmin
//     ) {
//       res.status(403).json({ message: "Not authorized" });
//       return;
//     }

//     const imageUrl = post.image;
//     const authorId = post.author.toString();
//     const postId = post._id.toString();

//     await Post.findByIdAndDelete(post._id);

//     req.app.get("io").to(authorId).emit("postDeleted", {
//       postId: postId,
//       message: "Your post has been deleted successfully",
//     });

//     res.json({ message: "Post deleted successfully" });

//     setImmediate(async () => {
//       try {
//         await updateUserPoints(authorId, -5);

//         await Comment.deleteMany({ post: postId });

//         const deletedNotifications = await Notification.deleteMany({
//           post: postId,
//         });

//         if (imageUrl) {
//           await deleteImageFromBunnyStorage(imageUrl);
//         }
//       } catch (cleanupError) {}
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const getMyPosts = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = 5; // fixed to 5 per your request
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar")
      .lean();

    const total = await Post.countDocuments({ author: req.user._id });

    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



// export const updatePost = async (
//   req: CustomRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     if (!req.user) {
//       res.status(401).json({ message: "Not authenticated" });
//       return;
//     }

//     const { title, content, youtubeLink, tags, links, poll } = req.body;
//     const post = await Post.findById(req.params.id);

//     if (!post) {
//       res.status(404).json({ message: "Post not found" });
//       return;
//     }

//     if (
//       post.author.toString() !== req.user._id.toString() &&
//       !req.user.isAdmin
//     ) {
//       res.status(403).json({ message: "Not authorized" });
//       return;
//     }

//     let image = post.image;
//     if (req.file) {
//       try {
//         if (post.image) {
         
//           // await deleteImageFromBunnyStorage(post.image);
//         }
//         image = await BunnyStorageService.uploadImage(
//           req.file.buffer,
//           req.file.originalname,
//           "community-posts"
//         );
//       } catch (uploadError) {
//         res.status(500).json({ message: "Image upload failed" });
//         return;
//       }
//     }

//     // Update standard fields
//     post.title = title || post.title;
//     post.content = content || post.content;
//     post.youtubeLink =
//       youtubeLink !== undefined ? youtubeLink : post.youtubeLink;
//     post.image = image;
//     post.links = links
//       ? links.split(",").map((link: string) => link.trim())
//       : post.links;
//     post.tags = tags
//       ? tags.split(",").map((tag: string) => tag.trim())
//       : post.tags;

//     // --- ADDED: Poll update logic ---
//     if (poll) {
//       try {
//         const pollOptions = JSON.parse(poll);
//         // If there's an existing poll, we update its options.
//         // This simple approach replaces the options array. A more complex
//         // implementation could try to merge based on option text to preserve votes,
//         // but that can be tricky. For now, we'll reset votes on option changes.
//         const newPollData = {
//           options: pollOptions.map((optionText: string) => {
//             // Try to find a matching existing option to preserve votes
//             const existingOption = post.poll?.options.find(
//               (o) => o.text === optionText
//             );
//             return {
//               text: optionText,
//               votes: existingOption ? existingOption.votes : [],
//             };
//           }),
//           // Voters list should be preserved if the poll structure is just being edited
//           voters: post.poll?.voters || [],
//         };
//         post.poll = newPollData;
//       } catch (pollError) {
//         res.status(400).json({ message: "Invalid poll data format" });
//         return;
//       }
//     } else {
//       // If an empty poll is sent, it means it should be removed
//       post.poll = undefined;
//     }
//     // --- END OF POLL LOGIC ---

//     const updatedPost = await post.save();

//     const populatedPost = await Post.findById(updatedPost._id).populate(
//       "author",
//       "name avatar"
//     );

//     // Emit to all clients that a post was updated
//     //req.app.get("io").emit("postUpdated", populatedPost);

//        req.app.get("io").to(req.user._id.toString()).emit("postUpdated", {
//       post: populatedPost,
//       message: "Your post has been updated successfully!",
//     });

//     res.status(200).json(populatedPost);
//   } catch (error) {
   
//     res.status(500).json({ message: "Server error" });
//   }
// };









// Add this new function to your post controller
export const getPostById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name avatar")
      .lean(); // .lean() for better performance

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    // We only send the post data. Comments will be fetched separately by the client.
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};













export const createPost = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }

        const { title, content, youtubeLink, tags, poll, links } = req.body;
        let image = "";
        let videoUrl, videoThumbnailUrl, videoGuid;
        let pointsToAward = 0; // Initialize points

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (files && files.image) {
            try {
                image = await BunnyStorageService.uploadImage(files.image[0].buffer, files.image[0].originalname, "community-posts");
                pointsToAward += 50; // Add points for image
            } catch (uploadError) {
                res.status(500).json({ message: "Image upload failed" });
                return;
            }
        } else if (files && files.video) {
            try {
                const videoData = await BunnyStreamService.uploadVideo(files.video[0].buffer, files.video[0].originalname);
                videoUrl = videoData.videoUrl;
                videoThumbnailUrl = videoData.thumbnailUrl;
                videoGuid = videoData.guid;
                pointsToAward += 100; // Add points for video
            } catch (uploadError) {
                res.status(500).json({ message: "Video upload failed" });
                return;
            }
        }

        // Add points for YouTube link if no video was uploaded
        if (youtubeLink && !videoUrl) {
            pointsToAward += 100;
        }

        // Add points for links
        if (links && links.split(",").length > 0) {
            pointsToAward += 30;
        }


        let pollData;
        if (poll) {
            try {
                const pollOptions = JSON.parse(poll);
                pollData = {
                    options: pollOptions.map((option: string) => ({ text: option, votes: [] })),
                    voters: [],
                };
            } catch (pollError) {
                res.status(400).json({ message: "Invalid poll data format" });
                return;
            }
        }

        const post = new Post({
            author: req.user._id,
            title,
            content,
            image,
            videoUrl,
            videoThumbnailUrl,
            videoGuid,
            youtubeLink,
            links: links ? links.split(",").map((link: string) => link.trim()) : [],
            tags: tags ? tags.split(",").map((tag: string) => tag.trim()) : [],
            poll: pollData,
        });

        const savedPost = await post.save();

        // Use the calculated points
        if (pointsToAward > 0) {
            setImmediate(() => {
                updateUserPoints(req.user!._id.toString(), pointsToAward);
            });
        }

        const populatedPost = await Post.findById(savedPost._id).populate("author", "name avatar");
        req.app.get("io").to(req.user._id.toString()).emit("postCreated", {
            post: populatedPost,
            message: "Your post has been created successfully",
        });

        res.status(201).json(populatedPost);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};


export const updatePost = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }

        const { title, content, youtubeLink, tags, links, poll, removeVideo, removeImage } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            res.status(403).json({ message: "Not authorized" });
            return;
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Handle new file uploads
        if (files && files.image) {
            if (post.image) await deleteImageFromBunnyStorage(post.image);
            if (post.videoGuid) await BunnyStreamService.deleteVideo(post.videoGuid);
            post.image = await BunnyStorageService.uploadImage(files.image[0].buffer, files.image[0].originalname, "community-posts");
            post.videoUrl = undefined;
            post.videoThumbnailUrl = undefined;
            post.videoGuid = undefined;
        } else if (files && files.video) {
            if (post.image) await deleteImageFromBunnyStorage(post.image);
            if (post.videoGuid) await BunnyStreamService.deleteVideo(post.videoGuid);
            const videoData = await BunnyStreamService.uploadVideo(files.video[0].buffer, files.video[0].originalname);
            post.videoUrl = videoData.videoUrl;
            post.videoThumbnailUrl = videoData.thumbnailUrl;
            post.videoGuid = videoData.guid;
            post.image = undefined;
        }

        // Handle explicit removal flags from frontend
        if (removeImage === 'true' && post.image) {
            await deleteImageFromBunnyStorage(post.image);
            post.image = undefined;
        }
        if (removeVideo === 'true' && post.videoGuid) {
            await BunnyStreamService.deleteVideo(post.videoGuid);
            post.videoUrl = undefined;
            post.videoThumbnailUrl = undefined;
            post.videoGuid = undefined;
        }

        // Update standard fields
        post.title = title || post.title;
        post.content = content || post.content;
        post.youtubeLink = youtubeLink !== undefined ? youtubeLink : post.youtubeLink;
        post.links = links ? links.split(",").map((link: string) => link.trim()) : post.links;
        post.tags = tags ? tags.split(",").map((tag: string) => tag.trim()) : post.tags;

        // Poll update logic (your existing code)
       if (poll) {
      try {
        const pollOptions = JSON.parse(poll);
        // If there's an existing poll, we update its options.
        // This simple approach replaces the options array. A more complex
        // implementation could try to merge based on option text to preserve votes,
        // but that can be tricky. For now, we'll reset votes on option changes.
        const newPollData = {
          options: pollOptions.map((optionText: string) => {
            // Try to find a matching existing option to preserve votes
            const existingOption = post.poll?.options.find(
              (o) => o.text === optionText
            );
            return {
              text: optionText,
              votes: existingOption ? existingOption.votes : [],
            };
          }),
          // Voters list should be preserved if the poll structure is just being edited
          voters: post.poll?.voters || [],
        };
        post.poll = newPollData;
      } catch (pollError) {
        res.status(400).json({ message: "Invalid poll data format" });
        return;
      }
    } else {
      // If an empty poll is sent, it means it should be removed
      post.poll = undefined;
    }

        const updatedPost = await post.save();
        const populatedPost = await Post.findById(updatedPost._id).populate("author", "name avatar");

        req.app.get("io").to(req.user._id.toString()).emit("postUpdated", {
            post: populatedPost,
            message: "Your post has been updated successfully!",
        });

        res.status(200).json(populatedPost);
    } catch (error) {
      //  console.error("Update Post Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deletePost = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }

        const post: any = await Post.findById(req.params.id);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            res.status(403).json({ message: "Not authorized" });
            return;
        }

        const imageUrl = post.image;
        const videoGuid = post.videoGuid;
        const authorId = post.author.toString();
        const postId = post._id.toString();

        // Calculate points to deduct before deleting the post
        let pointsToDeduct = 0;
        if (post.image) {
            pointsToDeduct += 50;
        }
        if (post.videoUrl || post.youtubeLink) {
            pointsToDeduct += 100;
        }
        if (post.links && post.links.length > 0) {
            pointsToDeduct += 30;
        }

        await Post.findByIdAndDelete(post._id);

        req.app.get("io").to(authorId).emit("postDeleted", {
            postId: postId,
            message: "Your post has been deleted successfully",
        });

        res.json({ message: "Post deleted successfully" });

        setImmediate(async () => {
            try {
                // Use the calculated points for deduction
                if (pointsToDeduct > 0) {
                    await updateUserPoints(authorId, -pointsToDeduct);
                }

                await Comment.deleteMany({ post: postId });
                await Notification.deleteMany({ post: postId });

                if (imageUrl) {
                    await deleteImageFromBunnyStorage(imageUrl);
                }
                if (videoGuid) {
                    await BunnyStreamService.deleteVideo(videoGuid);
                }
            } catch (cleanupError) {
                //console.error("Post deletion cleanup error:", cleanupError);
            }
        });
    } catch (error) {
        //console.error("Delete Post Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};