import User from '../models/User.model';

// Configuration for levels and badges
export const LEVEL_CONFIG = [
    { level: 1, points: 500, name: 'Star Club Member' },
    { level: 2, points: 5000, name: 'Active Star' },
    { level: 3, points: 10000, name: 'Great Star' },
    { level: 4, points: 20000, name: 'Inspiring Star' },
    { level: 5, points: 30000, name: 'Torch Bearer' },
    { level: 6, points: 40000, name: 'Role Model' },
    { level: 7, points: 50000, name: 'Game Changer' },
    { level: 8, points: 80000, name: 'Catalyst Star' },
    { level: 9, points: 100000, name: 'Unstoppable Star' },
];

/**
 * Checks a user's points and awards any new badges and updates their level.
 * @param {string} userId - The ID of the user to check.
 */
export const checkAndAwardBadges = async (userId: string): Promise<void> => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return;
        }

        const userPoints = user.points;
        let newLevel = 0;
        const awardedLevels = new Set(user.leaderboardBadges.map(badge => badge.level));

        // Determine the highest level the user has achieved based on points
        for (const levelInfo of LEVEL_CONFIG) {
            if (userPoints >= levelInfo.points) {
                newLevel = levelInfo.level;
            } else {
                break; // Stop checking once points are below a level's requirement
            }
        }

        // Filter for levels the user has achieved but hasn't been awarded the badge for yet
        const badgesToAward = LEVEL_CONFIG
            .filter(levelInfo => userPoints >= levelInfo.points && !awardedLevels.has(levelInfo.level));

        if (badgesToAward.length > 0) {
            const newBadges = badgesToAward.map(levelInfo => ({
                name: levelInfo.name,
                level: levelInfo.level,
                earnedAt: new Date(),
            }));
            user.leaderboardBadges.push(...newBadges);
        }

        // Update user's main level if it has changed
        if (user.level !== newLevel) {
            user.level = newLevel;
        }

        // Only save to the database if there were changes to badges or level
        if (user.isModified('leaderboardBadges') || user.isModified('level')) {
            await user.save();
            // TODO: You could emit a socket.io event here to notify the user of their new badge/level in real-time
        }

    } catch (error) {
        // console.error(`Error in checkAndAwardBadges for user ${userId}:`, error);
    }
};
