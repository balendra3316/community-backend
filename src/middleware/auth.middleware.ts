




import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.model';


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


    if (req.cookies.token) {
      token = req.cookies.token;
    } 

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


    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
    

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }


    req.user = user;
    next();
  } catch (error) {
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







// export const optionalProtect = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     let token;

//     if (req.cookies.token) {
//       token = req.cookies.token;
//     } else if (req.headers.authorization?.startsWith('Bearer')) {
//       token = req.headers.authorization.split(' ')[1];
//     }

//     // This is the key difference: if no token, just move on
//     if (!token) {
//       return next();
//     }

//     if (!process.env.JWT_SECRET) {
//       throw new Error('JWT_SECRET is not defined');
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
//     const user = await User.findById(decoded.id);

//     // If token is valid, attach user. If not, just move on.
//     if (user) {
//       req.user = user;
//     }

//     next();
//   } catch (error) {
//     // In case of an invalid token, don't block the request, just proceed without a user.
//     next();
//   }
// };