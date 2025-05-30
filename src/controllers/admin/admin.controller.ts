import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin, { IAdmin } from '../../models/Admin.model';

// Generate admin token
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

// Admin login
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = generateAdminToken((admin._id as string).toString());


    // Set cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Return admin data without password
    const adminData = {
      _id: admin._id,
      name: admin.name,
      email: admin.email
    };

    res.status(200).json({ admin: adminData });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin authentication' });
  }
};

// Get current admin
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
    console.error('Get current admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin logout
export const adminLogout = (req: Request, res: Response): Promise<void> | void => {
  res.cookie('adminToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0),
  });
  
  res.status(200).json({ message: 'Admin logged out successfully' });
};

// Create initial admin (for setup)
export const createInitialAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if admin already exists
    const adminExists = await Admin.findOne({});
    
    if (adminExists) {
      res.status(400).json({ message: 'Admin already exists' });
      return;
    }
    
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email and password are required' });
      return;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create admin
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
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};