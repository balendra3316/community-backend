import { Request, Response, NextFunction } from 'express';
import User from '../models/User.model'; // Import the User model

export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // This middleware must run AFTER the 'protect' middleware
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }

  const user = req.user;
  const now = new Date();

  // --- NEW, SECURE LOGIC ---
  // Check 1: Is the subscription status 'active'?
  // Check 2: Is there an endDate?
  // Check 3: Is the endDate still in the future?
  if (
    user.subscription.status === 'active' &&
    user.subscription.endDate &&
    user.subscription.endDate > now
  ) {
    // If all checks pass, the user is subscribed and can proceed.
    next();
  } else {
    // If any check fails, the subscription is considered expired.
    
    // Optional but recommended: Update the status in the DB for data hygiene.
    // This runs in the background and doesn't slow down the user's response.
    if (user.subscription.status === 'active') {
      user.subscription.status = 'expired';
      user.save().catch((err: any) =>{ console.error("Failed to update user status to expired:", err)});
    }
    
    // Deny access to the feature.
    res.status(403).json({ message: 'Forbidden: An active subscription is required for this feature.' });
  }
};