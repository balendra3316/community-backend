import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.model';


declare global {
  namespace Express {
    interface Request {
      admin?: any;
    }
  }
}

export const protectAdminRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    const token = req.cookies.adminToken;

    if (!token) {
      res.status(401).json({ message: 'Not authorized as admin, no token' });
      return;
    }


    const secret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, secret) as { id: string; isAdmin: boolean };
    

    if (!decoded.isAdmin) {
      res.status(401).json({ message: 'Not authorized as admin' });
      return;
    }


    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      res.status(401).json({ message: 'Admin not found' });
      return;
    }


    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized as admin, token failed' });
  }
};