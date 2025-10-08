import { Request, Response } from 'express';
import JournalEntry from '../models/JournalEntry.model';
import { updateStreaksAndBadges } from '../helpers/progress.helper'; 

import mongoose from 'mongoose';
import dayjs from 'dayjs'; 
import isToday from 'dayjs/plugin/isToday';
dayjs.extend(isToday);

// Optimized 'create' function
export const createJournalEntry = async (req: Request, res: Response): Promise<void> => {
    try {
        const { practiceDate, minutes, mood, energy, notes } = req.body;
        const userId = req.user!._id;

      
        if (!dayjs(practiceDate).isToday()) {
            res.status(400).json({ message: 'Journal entries can only be created for the current date.' });
            return;
        }

        const newEntry = await JournalEntry.create({
            userId, practiceDate, minutes, mood, energy, notes
        });
        
       
        res.status(201).json(newEntry);

     
        updateStreaksAndBadges(userId).catch(streakError => {
            console.error("BACKGROUND streak update failed:", streakError);
        });

    } catch (error: any) {
        res.status(400).json({ message: 'Failed to create journal entry', error: error.message });
    }
};

// Get all journal entries for the logged-in user (paginated or limited)
export const getJournalEntries = async (req: Request, res: Response): Promise<void> => {
    try {
        const entries = await JournalEntry.find({ userId: req.user!._id })
            .sort({ practiceDate: -1 })
            .limit(10); 
        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch journal entries' });
    }
};


// Updated 'update' function
export const updateJournalEntry = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        
        
        const updateData = { ...req.body };
        delete updateData.practiceDate;

        const entry = await JournalEntry.findOneAndUpdate(
            { _id: id, userId: req.user!._id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!entry) {
            res.status(404).json({ message: 'Journal entry not found or you are not the owner' });
            return;
        }
        res.status(200).json(entry);
    } catch (error: any) {
        res.status(400).json({ message: 'Failed to update journal entry', error: error.message });
    }
};

// Delete a journal entry
export const deleteJournalEntry = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const entry = await JournalEntry.findOneAndDelete({ _id: id, userId: req.user!._id });
        
        if (!entry) {
            res.status(404).json({ message: 'Journal entry not found or you are not the owner' });
            return;
        }
        res.status(200).json({ message: 'Journal entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete journal entry' });
    }
};

// Get dates with entries for a specific month
export const getJournalDatesForMonth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { year, month } = req.query;
        if (!year || !month) {
            res.status(400).json({ message: 'Year and month query parameters are required' });
            return;
        }

        const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
        const endDate = new Date(Date.UTC(Number(year), Number(month), 1));
        
        const entries = await JournalEntry.find({
            userId: req.user!._id,
            practiceDate: { $gte: startDate, $lt: endDate },
        }).select('practiceDate');

        const dates = entries.map(entry => entry.practiceDate.toISOString().split('T')[0]);
        const uniqueDates = [...new Set(dates)];
        
        res.status(200).json(uniqueDates);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch journal dates' });
    }
};

// we can skip current streak badges this alreday in user object

export const getProgressSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user._id;
        // remove depearted ObjectID
        // 1. Calculate Total Minutes using an efficient aggregation pipeline
        const totalMinutesResult = await JournalEntry.aggregate([
            // { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $match: { userId: userId } },
            { $group: { _id: null, totalMinutes: { $sum: '$minutes' } } }
        ]);
        const totalMinutes = totalMinutesResult.length > 0 ? totalMinutesResult[0].totalMinutes : 0;

        // 2. Get streaks and badges directly from the user object (which is always fresh)
        const { currentStreak, longestStreak, badges } = req.user!;

        // 3. Send the complete summary
        res.status(200).json({
            totalMinutes,
            currentStreak,
            longestStreak,
            badges,
        });

    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch progress summary' });
    }
};