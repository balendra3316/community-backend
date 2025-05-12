// // src/middleware/auth.middleware.ts
// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// import User, { IUser } from '../models/User.model';

// // Extend Express Request interface to include user
// // declare global {
// //   namespace Express {
// //     interface Request {
// //       user?: IUser;
// //     }
// //   }
// // }

// export const protect = async (req: Request, res: Response, next: NextFunction) => {
//   let token;

//   // Get token from cookies
//   if (req.cookies.token) {
//     token = req.cookies.token;
//   }

//   // Check if token exists
//   if (!token) {
//     return res.status(401).json({ message: 'Not authorized, no token' });
//   }

//   try {
//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    
//     // Get user from the token
//     const user = await User.findById(decoded.id).select('-password');
    
//     if (!user) {
//       return res.status(401).json({ message: 'Not authorized, user not found' });
//     }
    
//     req.user = user;
//     next();
//   } catch (error) {
//     console.error('Auth middleware error:', error);
//     res.status(401).json({ message: 'Not authorized, token failed' });
//   }
// };

// export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
//   if (req.user && req.user.isAdmin) {
//     next();
//   } else {
//     res.status(403).json({ message: 'Not authorized as an admin' });
//   }
// };







// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// import User, { IUser } from '../models/User.model';

// // Extend Express Request interface to include user
// declare global {
//   namespace Express {
//     interface Request {
//       user?: IUser;
//     }
//   }
// }

// export const protect = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   let token;

//   if (req.cookies.token) {
//     token = req.cookies.token;
//   }

//   if (!token) {
//     res.status(401).json({ message: 'Not authorized, no token' });
//     return;
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
//     const user = await User.findById(decoded.id).select('-password');

//     if (!user) {
//       res.status(401).json({ message: 'Not authorized, user not found' });
//       return;
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     console.error('Auth middleware error:', error);
//     res.status(401).json({ message: 'Not authorized, token failed' });
//   }
// };

// export const adminOnly = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): void => {
//   if (req.user && req.user.isAdmin) {
//     next();
//   } else {
//     res.status(403).json({ message: 'Not authorized as an admin' });
//   }
// };

















// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.model';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token;

    // Check for token in cookies first (preferred for web apps)
    if (req.cookies.token) {
      token = req.cookies.token;
    } 
    // Also allow token in Authorization header (for API clients)
    else if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ message: 'Not authorized, authentication required' });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    
    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error instanceof Error ? error.message : error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token, please login again' });
      return;
    }
    
    res.status(401).json({ message: 'Not authorized, authentication failed' });
  }
};

export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};
