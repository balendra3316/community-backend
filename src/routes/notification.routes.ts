// src/routes/notification.routes.ts
import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount } from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();


router.get('/', protect, getNotifications);


router.put('/:id', protect, markAsRead);


router.put('/', protect, markAllAsRead);


router.delete('/:id', protect, deleteNotification);


router.get('/unread', protect, getUnreadCount);

export default router;