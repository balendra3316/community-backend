
import { Request, Response } from "express";
import User from "../models/User.model";
import PointsHistory from "../models/PointsHistory.model";
import mongoose from "mongoose";




export const getAllTimeLeaderboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const limit = parseInt(req.query.limit as string) || 10;

    const [leaderboardData, userRankData] = await Promise.all([

      User.aggregate([
        { $match: { points: { $gt: 0 } } }, // Filter out users with 0 points
        { $sort: { points: -1 } },
        { $limit: limit },
        { $project: { name: 1, avatar: 1, points: 1 } },
      ]),


      User.aggregate([
        {
          $facet: {
            user: [
              { $match: { _id: userId } },
              { $project: { name: 1, avatar: 1, points: 1 } },
            ],
            rank: [
              { $match: { points: { $gt: 0 } } }, // Only consider users with points > 0 for ranking
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

    const leaderboard = leaderboardData.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    const user = userRankData[0]?.user[0];
    const userPoints = user?.points || 0;
    let userRank = userRankData[0]?.rank[0]?.rank || null;


    if (userPoints === 0) {
      userRank = null;
    }

    const response = {
      leaderboard,
      user: {
        _id: userId,
        name: user?.name || "",
        avatar: user?.avatar || "",
        points: userPoints,
        rank: userRank,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};




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


    let userRank = null;
    if (userPoints > 0) {

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
    res.status(500).json({ message: "Server error" });
  }
};


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


    let userRank = null;
    if (userPoints > 0) {

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
    res.status(500).json({ message: "Server error" });
  }
};
