





// controllers/leaderboard.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User.model";
import PointsHistory from "../models/PointsHistory.model";

// Helper: shape a pipeline that enriches a stream with user name/avatar and latest leaderboard badge
function lookupUserWithLatestBadge() {
  return [
    {
      $lookup: {
        from: "users",
        localField: "_id",           // current document has _id: userId after grouping OR is User itself
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: {
              name: 1,
              avatar: 1,
              // Get last badge: handle when array missing/empty
              leaderboardBadges: 1,
            },
          },
          // Derive latestBadge safely
          {
            $addFields: {
              latestBadge: {
                $let: {
                  vars: {
                    arr: { $ifNull: ["$leaderboardBadges", []] },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: "$$arr" }, 0] },
                      { $arrayElemAt: ["$$arr", -1] }, // last element
                      null,
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              name: 1,
              avatar: 1,
              "latestBadge.name": 1,
              "latestBadge.level": 1,
              "latestBadge.earnedAt": 1,
            },
          },
        ],
      },
    },
    { $unwind: "$user" },
  ];
}

// ============== ALL-TIME ==============
export const getAllTimeLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    //const userId = new mongoose.Types.ObjectId(req.user?._id);
    const userId = req.user?._id;
    const limit = parseInt(req.query.limit as string) || 10;

    // Top list with latestBadge for each user
    const leaderboardData = await User.aggregate([
      { $match: { points: { $gt: 0 } } },
      { $sort: { points: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          name: 1,
          avatar: 1,
          points: 1,
          leaderboardBadges: 1,
        },
      },
      // add latestBadge derived from last element
      {
        $addFields: {
          latestBadge: {
            $let: {
              vars: { arr: { $ifNull: ["$leaderboardBadges", []] } },
              in: {
                $cond: [
                  { $gt: [{ $size: "$$arr" }, 0] },
                  { $arrayElemAt: ["$$arr", -1] },
                  null,
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          name: 1,
          avatar: 1,
          points: 1,
          "latestBadge.name": 1,
          "latestBadge.level": 1,
          "latestBadge.earnedAt": 1,
        },
      },
    ]);

    const leaderboard = leaderboardData.map((u: any, index: number) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      points: u.points,
      rank: index + 1,
      latestBadge: u.latestBadge || null,
    }));

    // Rank of current user (points > 0 only)
    const userRankData = await User.aggregate([
      {
        $facet: {
          user: [
            { $match: { _id: userId } },
            {
              $project: {
                name: 1,
                avatar: 1,
                points: 1,
                leaderboardBadges: 1,
              },
            },
            {
              $addFields: {
                latestBadge: {
                  $let: {
                    vars: { arr: { $ifNull: ["$leaderboardBadges", []] } },
                    in: {
                      $cond: [
                        { $gt: [{ $size: "$$arr" }, 0] },
                        { $arrayElemAt: ["$$arr", -1] },
                        null,
                      ],
                    },
                  },
                },
              },
            },
            {
              $project: {
                name: 1,
                avatar: 1,
                points: 1,
                "latestBadge.name": 1,
                "latestBadge.level": 1,
                "latestBadge.earnedAt": 1,
              },
            },
          ],
          rank: [
            { $match: { points: { $gt: 0 } } },
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
    ]);

    const u = userRankData[0]?.user[0];
    const userPoints = u?.points || 0;
    let userRank = userRankData[0]?.rank[0]?.rank || null;
    if (userPoints === 0) userRank = null;

    res.json({
      leaderboard,
      user: {
        _id: userId,
        name: u?.name || "",
        avatar: u?.avatar || "",
        points: userPoints,
        rank: userRank,
        latestBadge: u?.latestBadge || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ============== WEEKLY ==============
export const getWeeklyLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    //const userId = new mongoose.Types.ObjectId(req.user?._id);
    const userId = req.user?._id;
    const limit = parseInt(req.query.limit as string) || 10;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Top weekly
    const leaderboardResult = await PointsHistory.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$userId", points: { $sum: "$points" } } },
      { $match: { points: { $gt: 0 } } },
      { $sort: { points: -1 } },
      { $limit: limit },
      ...lookupUserWithLatestBadge(),
      {
        $project: {
          _id: 1,
          points: 1,
          name: "$user.name",
          avatar: "$user.avatar",
          latestBadge: "$user.latestBadge",
        },
      },
    ]);

    const leaderboard = leaderboardResult.map((row: any, index: number) => ({
      _id: row._id,
      name: row.name,
      avatar: row.avatar,
      points: row.points,
      rank: index + 1,
      latestBadge: row.latestBadge || null,
    }));

    // Current user points and rank in window, plus profile with latestBadge
    const userDataResult = await PointsHistory.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$userId", points: { $sum: "$points" } } },
      {
        $facet: {
          userPoints: [{ $match: { _id: userId } }, { $project: { points: 1 } }],
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
    ]);

    const userPointsData = userDataResult[0]?.userPoints[0];
    const allUsers = userDataResult[0]?.allPositiveUsers[0]?.users || [];

    let userPoints = userPointsData?.points || 0;
    userPoints = userPoints > 0 ? userPoints : 0;

    let userRank: number | null = null;
    if (userPoints > 0) {
      const usersWithMorePoints = allUsers.filter((u: any) => u.points > userPoints).length;
      userRank = usersWithMorePoints + 1;
    }

    const userProfile = await User.aggregate([
      { $match: { _id: userId } },
      {
        $project: {
          name: 1,
          avatar: 1,
          leaderboardBadges: 1,
        },
      },
      {
        $addFields: {
          latestBadge: {
            $let: {
              vars: { arr: { $ifNull: ["$leaderboardBadges", []] } },
              in: {
                $cond: [
                  { $gt: [{ $size: "$$arr" }, 0] },
                  { $arrayElemAt: ["$$arr", -1] },
                  null,
                ],
              },
            },
          },
        },
      },
      { $project: { name: 1, avatar: 1, latestBadge: 1 } },
    ]);

    const up = userProfile[0];

    res.json({
      leaderboard,
      user: {
        _id: userId,
        name: up?.name || "",
        avatar: up?.avatar || "",
        points: userPoints,
        rank: userRank,
        latestBadge: up?.latestBadge || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ============== MONTHLY ==============
export const getMonthlyLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    //const userId = new mongoose.Types.ObjectId(req.user?._id);
    const userId = req.user?._id;
    
    const limit = parseInt(req.query.limit as string) || 10;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboardResult = await PointsHistory.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$userId", points: { $sum: "$points" } } },
      { $match: { points: { $gt: 0 } } },
      { $sort: { points: -1 } },
      { $limit: limit },
      ...lookupUserWithLatestBadge(),
      {
        $project: {
          _id: 1,
          points: 1,
          name: "$user.name",
          avatar: "$user.avatar",
          latestBadge: "$user.latestBadge",
        },
      },
    ]);

    const leaderboard = leaderboardResult.map((row: any, index: number) => ({
      _id: row._id,
      name: row.name,
      avatar: row.avatar,
      points: row.points,
      rank: index + 1,
      latestBadge: row.latestBadge || null,
    }));

    const userDataResult = await PointsHistory.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$userId", points: { $sum: "$points" } } },
      {
        $facet: {
          userPoints: [{ $match: { _id: userId } }, { $project: { points: 1 } }],
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
    ]);

    const userPointsData = userDataResult[0]?.userPoints[0];
    const allUsers = userDataResult[0]?.allPositiveUsers[0]?.users || [];

    let userPoints = userPointsData?.points || 0;
    userPoints = userPoints > 0 ? userPoints : 0;

    let userRank: number | null = null;
    if (userPoints > 0) {
      const usersWithMorePoints = allUsers.filter((u: any) => u.points > userPoints).length;
      userRank = usersWithMorePoints + 1;
    }

    const userProfile = await User.aggregate([
      { $match: { _id: userId } },
      {
        $project: {
          name: 1,
          avatar: 1,
          leaderboardBadges: 1,
        },
      },
      {
        $addFields: {
          latestBadge: {
            $let: {
              vars: { arr: { $ifNull: ["$leaderboardBadges", []] } },
              in: {
                $cond: [
                  { $gt: [{ $size: "$$arr" }, 0] },
                  { $arrayElemAt: ["$$arr", -1] },
                  null,
                ],
              },
            },
          },
        },
      },
      { $project: { name: 1, avatar: 1, latestBadge: 1 } },
    ]);

    const up = userProfile[0];

    res.json({
      leaderboard,
      user: {
        _id: userId,
        name: up?.name || "",
        avatar: up?.avatar || "",
        points: userPoints,
        rank: userRank,
        latestBadge: up?.latestBadge || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
