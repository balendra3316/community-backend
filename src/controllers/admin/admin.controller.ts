import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin, { IAdmin } from '../../models/Admin.model';


const generateAdminToken = (id: string): string => {
  const secret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const payload = { id, isAdmin: true };

  const options: SignOptions = {
    expiresIn: '3d', // Admin tokens expire in 1 day for security
  };

  return jwt.sign(payload, secret, options);
};


export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;


    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }


    const admin = await Admin.findOne({ email });

    if (!admin) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }


    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }


    const token = generateAdminToken((admin._id as string).toString());



    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });


    const adminData = {
      _id: admin._id,
      name: admin.name,
      email: admin.email
    };

    res.status(200).json({ admin: adminData });
  } catch (error) {
    res.status(500).json({ message: 'Server error during admin authentication' });
  }
};


export const getCurrentAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({ message: 'Not authenticated as admin' });
      return;
    }

    const admin = await Admin.findById(req.admin.id).select('-password');
    
    if (!admin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


export const adminLogout = (req: Request, res: Response): Promise<void> | void => {
  res.cookie('adminToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0),
  });
  
  res.status(200).json({ message: 'Admin logged out successfully' });
};


export const createInitialAdmin = async (req: Request, res: Response): Promise<void> => {
  try {

    const adminExists = await Admin.findOne({});
    
    if (adminExists) {
      res.status(400).json({ message: 'Admin already exists' });
      return;
    }
    
    const { name, email, password } = req.body;
    

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email and password are required' });
      return;
    }
    

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    

    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword
    });
    
    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};