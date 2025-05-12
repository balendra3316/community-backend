// src/controllers/leaderboard.controller.ts
import { Request, Response } from 'express';
import User from '../models/User.model';
import PointsHistory from '../models/PointsHistory.model';
import mongoose from 'mongoose';

// Get all-time leaderboard
export const getAllTimeLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const limit = parseInt(req.query.limit as string) || 10;

    // Top users
    const users = await User.find({})
      .sort({ points: -1 })
      .limit(limit)
      .select('name avatar points')
      .lean();

    // Add rank to each user
    const leaderboard = users.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Get user rank
    const user = await User.findById(userId).select('name avatar points').lean();

    const userRank = await User.countDocuments({
      points: { $gt: user?.points || 0 }
    });

    const response = {
      leaderboard,
      user: {
        _id: userId,
        name: user?.name || '',
        avatar: user?.avatar || '',
        points: user?.points || 0,
        rank: user ? userRank + 1 : null
      }
    };

    res.json(response);
  } catch (error) {
    console.error('All-time leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get weekly leaderboard
export const getWeeklyLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const limit = parseInt(req.query.limit as string) || 10;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Aggregated leaderboard
    const leaderboardData = await PointsHistory.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$userId', points: { $sum: '$points' } } },
      { $sort: { points: -1 } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: '$_id', name: '$user.name', avatar: '$user.avatar', points: 1 } },
      { $limit: limit }
    ]);

    // Add rank to each user
    const leaderboard = leaderboardData.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Logged-in user's weekly points
    const userPointsAgg = await PointsHistory.aggregate([
      { $match: { userId: userId, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$userId', points: { $sum: '$points' } } }
    ]);
    const userPoints = userPointsAgg[0]?.points || 0;

    // Calculate user rank
    const rankAgg = await PointsHistory.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$userId', points: { $sum: '$points' } } },
      { $match: { points: { $gt: userPoints } } },
      { $count: 'rank' }
    ]);
    const userRank = (rankAgg[0]?.rank || 0) + 1;

    const user = await User.findById(userId).select('name avatar').lean();

    res.json({
      leaderboard,
      user: {
        _id: userId,
        name: user?.name || '',
        avatar: user?.avatar || '',
        points: userPoints,
        rank: userRank
      }
    });
  } catch (error) {
    console.error('Weekly leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get 30-day leaderboard
export const getMonthlyLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?._id);
    const limit = parseInt(req.query.limit as string) || 10;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Aggregated leaderboard
    const leaderboardData = await PointsHistory.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$userId', points: { $sum: '$points' } } },
      { $sort: { points: -1 } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: '$_id', name: '$user.name', avatar: '$user.avatar', points: 1 } },
      { $limit: limit }
    ]);

    // Add rank to each user
    const leaderboard = leaderboardData.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Logged-in user's monthly points
    const userPointsAgg = await PointsHistory.aggregate([
      { $match: { userId: userId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$userId', points: { $sum: '$points' } } }
    ]);
    const userPoints = userPointsAgg[0]?.points || 0;

    // Calculate user rank
    const rankAgg = await PointsHistory.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$userId', points: { $sum: '$points' } } },
      { $match: { points: { $gt: userPoints } } },
      { $count: 'rank' }
    ]);
    const userRank = (rankAgg[0]?.rank || 0) + 1;

    const user = await User.findById(userId).select('name avatar').lean();

    res.json({
      leaderboard,
      user: {
        _id: userId,
        name: user?.name || '',
        avatar: user?.avatar || '',
        points: userPoints,
        rank: userRank
      }
    });
  } catch (error) {
    console.error('Monthly leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};