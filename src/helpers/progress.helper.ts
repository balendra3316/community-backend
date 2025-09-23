import { Types } from 'mongoose';
import JournalEntry from '../models/JournalEntry.model';
import User from '../models/User.model';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const BADGES = [
    { name: "First Step", days: 1 },
    { name: "3-Day Streak", days: 3 },
    { name: "7-Day Streak", days: 7 },
    { name: "14-Day Streak", days: 14 },
    { name: "30-Day Moonwalker", days: 30 },
    { name: "60-Day Virtuoso", days: 60 },
];





function dateDiffInDays(a: Date, b: Date): number {
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utc2 - utc1) / MS_PER_DAY);
}

export const updateStreaksAndBadges = async (userId: Types.ObjectId): Promise<void> => {
    const user = await User.findById(userId);
    if (!user) return;

    const allEntries = await JournalEntry.find({ userId }).sort({ practiceDate: 'desc' });
    if (allEntries.length === 0) return;

    const uniqueDates = [...new Set(allEntries.map(e => e.practiceDate.toISOString().split('T')[0]))]
                        .map(dateStr => new Date(dateStr))
                        .sort((a, b) => b.getTime() - a.getTime());
    
    if (uniqueDates.length === 0) {
        user.currentStreak = 0;
    } else if (uniqueDates.length === 1) {
        user.currentStreak = 1;
    } else {
        let currentStreak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
            if (dateDiffInDays(uniqueDates[i+1], uniqueDates[i]) === 1) {
                currentStreak++;
            } else {
                break;
            }
        }
        user.currentStreak = currentStreak;
    }

    if (user.currentStreak > user.longestStreak) {
        user.longestStreak = user.currentStreak;
    }
    
 for (const badge of BADGES) {
        if (user.currentStreak >= badge.days && !user.badges.includes(badge.name)) {
            user.badges.push(badge.name);
        }
    }

    await user.save();
};