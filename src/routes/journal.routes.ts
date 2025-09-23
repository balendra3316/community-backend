import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/subscription.middleware';
import {
    createJournalEntry,
    getJournalEntries,
    updateJournalEntry,
    deleteJournalEntry,
    getJournalDatesForMonth,
    getProgressSummary
} from '../controllers/journal.controller';

const router = express.Router();

// A logged-in user can always view their past entries
router.route('/')
    .get(protect, getJournalEntries);

// But they need an active subscription to create new ones
router.route('/')
    .post(protect,  createJournalEntry);

router.route('/dates')
    .get(protect, getJournalDatesForMonth);

// Updating and deleting also require a subscription
router.route('/:id')
    .put(protect,  updateJournalEntry)
    .delete(protect,  deleteJournalEntry);

router.get('/summary', protect, getProgressSummary);


export default router;