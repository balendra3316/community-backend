// src/controllers/leaderboard.controller.ts
import { Request, Response } from "express";
import User from "../models/User.model";
import PointsHistory from "../models/PointsHistory.model";
import mongoose from "mongoose";

// Get all-time leaderboard
export const getAllTimeLeaderboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const limit = parseInt(req.query.limit as string) || 10;

    // Single aggregation to get both leaderboard and user info
    const [leaderboardData, userRankData] = await Promise.all([
      // Get top users with rank
      User.aggregate([
        { $sort: { points: -1 } },
        { $limit: limit },
        { $project: { name: 1, avatar: 1, points: 1 } },
        {
          $addFields: {
            rank: {
              $add: [
                {
                  $indexOfArray: [
                    { $range: [0, limit] },
                    {
                      $subtract: [
                        { $indexOfArray: [{ $range: [0, limit] }, 0] },
                        0,
                      ],
                    },
                  ],
                },
                1,
              ],
            },
          },
        },
      ]),

      // Get user info and rank in single query
      User.aggregate([
        {
          $facet: {
            user: [
              { $match: { _id: userId } },
              { $project: { name: 1, avatar: 1, points: 1 } },
            ],
            rank: [
              { $match: { points: { $exists: true } } },
              { $sort: { points: -1 } },
              {
                $group: {
                  _id: null,
                  users: { $push: { _id: "$_id", points: "$points" } },
                },
              },
              { $unwind: { path: "$users", includeArrayIndex: "rank" } },
              { $match: { "users._id": userId } },
              { $project: { rank: { $add: ["$rank", 1] } } },
            ],
          },
        },
      ]),
    ]);

    // Add sequential rank to leaderboard
    const leaderboard = leaderboardData.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    const user = userRankData[0]?.user[0];
    const userRank = userRankData[0]?.rank[0]?.rank || null;

    const response = {
      leaderboard,
      user: {
        _id: userId,
        name: user?.name || "",
        avatar: user?.avatar || "",
        points: user?.points || 0,
        rank: userRank,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("All-time leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get weekly leaderboard (FIXED VERSION)
export const getWeeklyLeaderboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const limit = parseInt(req.query.limit as string) || 10;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [leaderboardResult, userDataResult] = await Promise.all([
      PointsHistory.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: "$userId", points: { $sum: "$points" } } },
        { $match: { points: { $gt: 0 } } },
        { $sort: { points: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
            pipeline: [{ $project: { name: 1, avatar: 1 } }],
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: 1,
            name: "$user.name",
            avatar: "$user.avatar",
            points: 1,
          },
        },
      ]),

      PointsHistory.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: "$userId", points: { $sum: "$points" } } },
        {
          $facet: {
            userPoints: [
              { $match: { _id: userId } },
              { $project: { points: 1 } },
            ],
            allPositiveUsers: [
              { $match: { points: { $gt: 0 } } },
              { $sort: { points: -1 } },
              {
                $group: {
                  _id: null,
                  users: { $push: { _id: "$_id", points: "$points" } },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const leaderboard = leaderboardResult.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    const userPointsData = userDataResult[0]?.userPoints[0];
    const allUsers = userDataResult[0]?.allPositiveUsers[0]?.users || [];

    let userPoints = userPointsData?.points || 0;
    userPoints = userPoints > 0 ? userPoints : 0;

    // Fixed rank calculation
    let userRank = null;
    if (userPoints > 0) {
      // Count how many users have strictly more points than current user
      const usersWithMorePoints = allUsers.filter(
        (u: any) => u.points > userPoints
      ).length;
      userRank = usersWithMorePoints + 1;
    }

    const user = await User.findById(userId).select("name avatar").lean();

    res.json({
      leaderboard,
      user: {
        _id: userId,
        name: user?.name || "",
        avatar: user?.avatar || "",
        points: userPoints,
        rank: userRank,
      },
    });
  } catch (error) {
    console.error("Weekly leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get 30-day leaderboard (FIXED VERSION)
export const getMonthlyLeaderboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const limit = parseInt(req.query.limit as string) || 10;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [leaderboardResult, userDataResult] = await Promise.all([
      PointsHistory.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: "$userId", points: { $sum: "$points" } } },
        { $match: { points: { $gt: 0 } } },
        { $sort: { points: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
            pipeline: [{ $project: { name: 1, avatar: 1 } }],
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: 1,
            name: "$user.name",
            avatar: "$user.avatar",
            points: 1,
          },
        },
      ]),

      PointsHistory.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: "$userId", points: { $sum: "$points" } } },
        {
          $facet: {
            userPoints: [
              { $match: { _id: userId } },
              { $project: { points: 1 } },
            ],
            allPositiveUsers: [
              { $match: { points: { $gt: 0 } } },
              { $sort: { points: -1 } },
              {
                $group: {
                  _id: null,
                  users: { $push: { _id: "$_id", points: "$points" } },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const leaderboard = leaderboardResult.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    const userPointsData = userDataResult[0]?.userPoints[0];
    const allUsers = userDataResult[0]?.allPositiveUsers[0]?.users || [];

    let userPoints = userPointsData?.points || 0;
    userPoints = userPoints > 0 ? userPoints : 0;

    // Fixed rank calculation
    let userRank = null;
    if (userPoints > 0) {
      // Count how many users have strictly more points than current user
      const usersWithMorePoints = allUsers.filter(
        (u: any) => u.points > userPoints
      ).length;
      userRank = usersWithMorePoints + 1;
    }

    const user = await User.findById(userId).select("name avatar").lean();

    res.json({
      leaderboard,
      user: {
        _id: userId,
        name: user?.name || "",
        avatar: user?.avatar || "",
        points: userPoints,
        rank: userRank,
      },
    });
  } catch (error) {
    console.error("Monthly leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
