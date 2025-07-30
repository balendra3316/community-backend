


// import { Request, Response } from 'express';
// import User from '../models/attendanceuser.model';

// // A helper function to sanitize the WhatsApp number
// const sanitizePhoneNumber = (phone: string): string => {
//   // Removes all non-digit characters from the string
//   return phone.replace(/\D/g, '');
// };


// export const registerUser = async (req: Request, res: Response): Promise<void> => {
//   const { name, email, whatsappNumber } = req.body;

//   // --- Backend Validation ---
//   if (!name || !email || !whatsappNumber) {
//     res.status(400).json({ message: 'Name, email, and WhatsApp number are required.' });
//     return;
//   }
//   if (name.length > 50) {
//     res.status(400).json({ message: 'Name cannot exceed 50 characters.' });
//     return;
//   }
//   if (name.trim().split(/\s+/).length > 20) {
//       res.status(400).json({ message: 'Name cannot exceed 20 words.' });
//       return;
//   }

//   const sanitizedNumber = sanitizePhoneNumber(whatsappNumber);
//   if (sanitizedNumber.length > 15 || sanitizedNumber.length < 7) { // Validating number length
//       res.status(400).json({ message: 'Please provide a valid number with 7 to 15 digits.' });
//       return;
//   }

//   try {
//     const userEmail = email.toLowerCase();
    
//     // Check if user already exists
//     const existingUser = await User.findOne({ $or: [{ email: userEmail }, { whatsappNumber: sanitizedNumber }] });
//     if (existingUser) {
//       res.status(409).json({ message: 'A user with this email or WhatsApp number already exists.' });
//       return;
//     }

//     // Create and save the new user
//     const newUser = new User({
//       name,
//       email: userEmail,
//       whatsappNumber: sanitizedNumber,
//     });
//     await newUser.save();

//     res.status(201).json({ message: 'Registered successfully!', user: newUser });

//   } catch (error: any) {
    
//     if (error.code === 11000) {
//         res.status(409).json({ message: 'A user with this email or WhatsApp number already exists.' });
//         return;
//     }
//     res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
//   }
// };


// // --- 2. Mark Attendance for an Existing User ---
// export const markAttendance = async (req: Request, res: Response): Promise<void> => {
//   const { whatsappNumber } = req.body;

//   if (!whatsappNumber) {
//     res.status(400).json({ message: 'WhatsApp number is required.' });
//     return;
//   }
  
//   const sanitizedNumber = sanitizePhoneNumber(whatsappNumber);
//   if (sanitizedNumber.length > 15 || sanitizedNumber.length < 7) { // Validating number length
//     res.status(400).json({ message: 'Please provide a valid number with 7 to 15 digits.' });
//     return;
//   }

//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0); 

//     const user = await User.findOne({ whatsappNumber: sanitizedNumber });

//     if (!user) {
//       res.status(404).json({ message: 'User not found. Please register first.' });
//       return;
//     }

//     const alreadyMarked = user.attendance.some(
//       (record) => new Date(record.date).toDateString() === today.toDateString()
//     );

//     if (alreadyMarked) {
//       res.status(200).json({ message: `Attendance already marked for today for ${user.name}.` });
//       return;
//     }

//     user.attendance.push({ date: new Date(), status: 'present' });
//     await user.save();

//     res.status(200).json({ message: `Attendance marked successfully for ${user.name}!` });

//   } catch (error: any) {
    
//     res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
//   }
// };




import { Request, Response } from 'express';
import User from '../models/attendanceuser.model';

/**
 * Sanitizes a phone number by removing non-digit characters
 * and stripping any leading '0' for standardization.
 * e.g., "+91 (0) 987-654-3210" becomes "9876543210"
 */
const sanitizePhoneNumber = (phone: string): string => {
  let sanitized = phone.replace(/\D/g, ''); // Removes all non-digit characters

  // If the number starts with a '0', remove it.
  // This standardizes numbers like '0987...' to '987...'
  if (sanitized.startsWith('0')) {
    sanitized = sanitized.substring(1);
  }
  
  return sanitized;
};


// --- 1. Register a New User ---
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, whatsappNumber } = req.body;

  // --- Backend Validation ---
  if (!name || !email || !whatsappNumber) {
    res.status(400).json({ message: 'Name, email, and WhatsApp number are required.' });
    return;
  }
  if (name.length > 50) {
    res.status(400).json({ message: 'Name cannot exceed 50 characters.' });
    return;
  }
  if (name.trim().split(/\s+/).length > 20) {
      res.status(400).json({ message: 'Name cannot exceed 20 words.' });
      return;
  }

  // The updated sanitizePhoneNumber function is used here
  const sanitizedNumber = sanitizePhoneNumber(whatsappNumber);
  if (sanitizedNumber.length > 15 || sanitizedNumber.length < 7) { // Validating number length
      res.status(400).json({ message: 'Please provide a valid number with 7 to 15 digits.' });
      return;
  }

  try {
    const userEmail = email.toLowerCase();
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email: userEmail }, { whatsappNumber: sanitizedNumber }] });
    if (existingUser) {
      res.status(409).json({ message: 'A user with this email or WhatsApp number already exists.' });
      return;
    }

    // Create and save the new user
    const newUser = new User({
      name,
      email: userEmail,
      whatsappNumber: sanitizedNumber, // The standardized number is saved
    });
    await newUser.save();

    res.status(201).json({ message: 'Registered successfully!', user: newUser });

  } catch (error: any) {
    if (error.code === 11000) {
        res.status(409).json({ message: 'A user with this email or WhatsApp number already exists.' });
        return;
    }
    res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
  }
};


// --- 2. Mark Attendance for an Existing User ---
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  const { whatsappNumber } = req.body;

  if (!whatsappNumber) {
    res.status(400).json({ message: 'WhatsApp number is required.' });
    return;
  }
  
  // The updated sanitizePhoneNumber function is also used here
  const sanitizedNumber = sanitizePhoneNumber(whatsappNumber);
  if (sanitizedNumber.length > 15 || sanitizedNumber.length < 7) { // Validating number length
    res.status(400).json({ message: 'Please provide a valid number with 7 to 15 digits.' });
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    // The search now uses the same standardized number format
    const user = await User.findOne({ whatsappNumber: sanitizedNumber });

    if (!user) {
      res.status(404).json({ message: 'User not found. Please register first.' });
      return;
    }

    const alreadyMarked = user.attendance.some(
      (record) => new Date(record.date).toDateString() === today.toDateString()
    );

    if (alreadyMarked) {
      res.status(200).json({ message: `Attendance already marked for today for ${user.name}.` });
      return;
    }

    user.attendance.push({ date: new Date(), status: 'present' });
    await user.save();

    res.status(200).json({ message: `Attendance marked successfully for ${user.name}!` });

  } catch (error: any) {
    res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
  }
};











export const getAttendanceData = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find()
        .select('name email whatsappNumber attendance')
        .sort({ joinDate: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      User.countDocuments()
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({ users, totalPages, currentPage: page });

  } catch (error: any) {
    
    res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
  }
};




export const exportAllAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        // Fetch ALL users without pagination, selecting all necessary fields
        const users = await User.find()
            .select('name email whatsappNumber attendance joinDate')
            .sort({ joinDate: -1 })
            .lean();

        res.status(200).json({ users });

    } catch (error: any) {
        
        res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
    }
};
