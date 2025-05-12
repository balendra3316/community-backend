// // src/routes/auth.routes.ts
// import express from 'express';
// import passport from 'passport';
// import { googleCallback, getCurrentUser, logout, updateProfile } from '../controllers/auth.controller';
// import { protect } from '../middleware/auth.middleware';

// const router = express.Router();

// // @route   GET /api/auth/google
// // @desc    Auth with Google
// // @access  Public
// router.get(
//   '/google',
//   passport.authenticate('google', { scope: ['profile', 'email'] })
// );

// // @route   GET /api/auth/google/callback
// // @desc    Google auth callback
// // @access  Public
// router.get(
//   '/google/callback',
//   passport.authenticate('google', { failureRedirect: '/login' }),
//   googleCallback
// );

// // @route   GET /api/auth/me
// // @desc    Get current user
// // @access  Private
// router.get('/me', protect, getCurrentUser)

// // @route   POST /api/auth/logout
// // @desc    Logout user
// // @access  Private
// router.post('/logout', logout);

// // @route   PUT /api/auth/profile
// // @desc    Update user profile
// // @access  Private
// router.put('/profile', protect, updateProfile);

// export default router;












// src/routes/auth.routes.ts
import express from 'express';
import { 
  getGoogleAuthURL,
  googleCallback, 
  getCurrentUser, 
  logout, 
  updateProfile 
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = express.Router();

// @route   GET /api/auth/google/url
// @desc    Get Google OAuth URL
// @access  Public
router.get('/google/url', getGoogleAuthURL);

// @route   GET /api/auth/google/callback
// @desc    Google auth callback
// @access  Public
router.get('/google/callback', googleCallback);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getCurrentUser);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', logout);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, upload.single('avatar'), updateProfile);

export default router;