
import { Request, Response } from 'express';
import User from '../models/attendanceuser.model';

import { CustomRequest } from '../types/express/express';
import StarClubAttendance from '../models/StarClubAttendance.model';

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











// export const getAttendanceData = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 15;
//     const skip = (page - 1) * limit;

//     const [users, totalUsers] = await Promise.all([
//       User.find()
//         .select('name email whatsappNumber attendance')
//         .sort({ joinDate: -1 })
//         .limit(limit)
//         .skip(skip)
//         .lean(),
//       User.countDocuments()
//     ]);

//     const totalPages = Math.ceil(totalUsers / limit);

//     res.status(200).json({ users, totalPages, currentPage: page });

//   } catch (error: any) {
    
//     res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
//   }
// };




// export const exportAllAttendance = async (req: Request, res: Response): Promise<void> => {
//     try {
//         // Fetch ALL users without pagination, selecting all necessary fields
//         const users = await User.find()
//             .select('name email whatsappNumber attendance joinDate')
//             .sort({ joinDate: -1 })
//             .lean();

//         res.status(200).json({ users });

//     } catch (error: any) {
        
//         res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
//     }
// };








// --- 3. Get Paginated Attendance Data ---
// NOTE: This function is updated to use the StarClubAttendance collection
export const getAttendanceData = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 15;
        const skip = (page - 1) * limit;

        // Use Promise.all to fetch data and total count concurrently
        const [results, totalRecords] = await Promise.all([
            // Aggregation pipeline to join StarClubAttendance with User
            StarClubAttendance.aggregate([
                // 1. Sort by the most recent attendance record creation date
                { $sort: { createdAt: -1 } },
                
                // 2. Apply pagination
                { $skip: skip },
                { $limit: limit },

                // 3. Join with the 'users' collection
                {
                    $lookup: {
                        from: 'users', // The collection name for the main User model
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },

                // 4. Deconstruct the userDetails array (it will have 0 or 1 element)
                {
                    $unwind: {
                        path: '$userDetails',
                        preserveNullAndEmptyArrays: true // Keep records even if user is deleted
                    }
                },

                // 5. Project the final structure to match the old API response
                {
                    $project: {
                        _id: '$userDetails._id', // Keep the user's original ID
                        name: '$userDetails.name',
                        email: '$userDetails.email',
                        whatsappNumber: '$userDetails.whatsappNumber',
                        attendance: '$attendance',
                    }
                }
            ]),
            StarClubAttendance.countDocuments()
        ]);

        const totalPages = Math.ceil(totalRecords / limit);
        
        // The key 'users' is used to maintain frontend compatibility
        res.status(200).json({ users: results, totalPages, currentPage: page });

    } catch (error: any) {
        res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
    }
};

// --- 4. Export All Attendance Data ---
// NOTE: This function is updated to use the StarClubAttendance collection
export const exportAllAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        // Aggregation pipeline to get all users and their attendance
        const users = await StarClubAttendance.aggregate([
            // 1. Join with the 'users' collection
            {
                $lookup: {
                    from: 'users', // The collection name for the main User model
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },

            // 2. Deconstruct the userDetails array
            {
                $unwind: {
                    path: '$userDetails',
                    preserveNullAndEmptyArrays: true
                }
            },

            // 3. Project the final structure to match the old API response
            {
                $project: {
                    _id: '$userDetails._id',
                    name: '$userDetails.name',
                    email: '$userDetails.email',
                    whatsappNumber: '$userDetails.whatsappNumber',
                    // Use the user's creation date as the joinDate
                    joinDate: '$userDetails.createdAt', 
                    attendance: '$attendance',
                }
            },

            // 4. Sort by joinDate descending to match the old function's behavior
            { $sort: { joinDate: -1 } }
        ]);

        res.status(200).json({ users });

    } catch (error: any) {
        res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
    }
};






















// this is for community direct button of attendace

// controllers/attendance.controller.ts



// @desc    Mark attendance for the current day
// @route   POST /api/attendance/mark
// @access  Private
export const SCmarkAttendance = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day

    let userAttendance = await StarClubAttendance.findOne({ userId });

    if (!userAttendance) {
      // If user has no record, create one
      userAttendance = new StarClubAttendance({
        userId,
        attendance: [{ date: today, status: 'present' }],
      });
    } else {
      // Check if attendance for today already exists
      const hasAttendedToday = userAttendance.attendance.some(
        (record) => record.date.getTime() === today.getTime()
      );

      if (hasAttendedToday) {
        res.status(400).json({ message: 'Attendance already marked for today' });
        return;
      }
      // Add new attendance record
      userAttendance.attendance.push({ date: today, status: 'present' });
    }

    await userAttendance.save();
    res.status(201).json({ message: 'Attendance marked successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if attendance has been marked for today
// @route   GET /api/attendance/check
// @access  Private
export const checkTodayAttendance = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }

        const userId = req.user._id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to the start of the day

        const userAttendance = await StarClubAttendance.findOne({ userId });

        if (!userAttendance) {
            res.json({ hasAttended: false });
            return;
        }

        const hasAttendedToday = userAttendance.attendance.some(
            (record) => record.date.getTime() === today.getTime()
        );

        res.json({ hasAttended: hasAttendedToday });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};