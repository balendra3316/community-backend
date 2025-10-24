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

  if (
    user.subscription.status === 'active' &&
    user.subscription.endDate &&
    user.subscription.endDate > now
  ) {
    // If all checks pass, the user is subscribed and can proceed.
    next();
  } else {
    
    if (user.subscription.status === 'active') {
      user.subscription.status = 'expired';
      user.save().catch((err: any) =>{ 
        //console.error("Failed to update user status to expired:", err)
      });
    }
    
    // Deny access to the feature.
    res.status(403).json({ message: 'Forbidden: An active subscription is required for this feature.' });
  }
};