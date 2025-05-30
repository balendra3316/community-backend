

// // src/middleware/upload.middleware.ts
// import multer from 'multer';
// import path from 'path';

// // Configure multer for memory storage
// const storage = multer.memoryStorage();

// // Filter for accepting only image files (for the original upload middleware)
// const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   const filetypes = /jpeg|jpg|png|gif/;
//   const mimetype = filetypes.test(file.mimetype);
//   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//   if (mimetype && extname) {
//     return cb(null, true);
//   }
//   cb(new Error('Only image files are allowed!'));
// };

// // Setup original upload middleware (keep this for backward compatibility)
// export const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//   fileFilter
// });

// // Filter for accepting image files for lessons
// const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   if (file.fieldname === 'imageFiles') {
//     const filetypes = /jpeg|jpg|png|gif/;
//     const mimetype = filetypes.test(file.mimetype);
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//     if (mimetype && extname) {
//       return cb(null, true);
//     }
//     cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed for images!'));
//   } else {
//     cb(null, true);
//   }
// };

// // Filter for accepting resource files (PDFs and DOCs)
// const resourceFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   if (file.fieldname === 'resourceFiles') {
//     const filetypes = /pdf|doc|docx|xls|xlsx|ppt|pptx/;
//     const mimetype = file.mimetype.includes('pdf') || 
//                     file.mimetype.includes('doc') || 
//                     file.mimetype.includes('xls') || 
//                     file.mimetype.includes('ppt') ||
//                     file.mimetype.includes('application/vnd.openxmlformats');
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//     if (mimetype && extname) {
//       return cb(null, true);
//     }
//     cb(new Error('Only PDF, DOC, XLS, or PPT files are allowed for resources!'));
//   } else {
//     cb(null, true);
//   }
// };




// // Updated upload middleware for lesson files
// export const uploadLessonFiles = multer({
//   storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
//   fileFilter: (req, file, cb) => {
//     if (file.fieldname.startsWith('imageFiles[')) {
//       imageFileFilter(req, file, cb);
//     } else if (file.fieldname.startsWith('resourceFiles[')) {
//       resourceFileFilter(req, file, cb);
//     } else {
//       cb(null, false);
//     }
//   }
// }).any(); // Use .any() to handle dynamic field names

// src/middleware/upload.middleware.ts
import multer from 'multer';
import path from 'path';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Filter for accepting only image files (for the original upload middleware)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed!'));
};

// Setup original upload middleware (keep this for backward compatibility)
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Combined filter for lesson files (images and resources)
const lessonFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if it's an image file
  if (file.fieldname.startsWith('imageFiles[')) {
    const imageTypes = /jpeg|jpg|png|gif/;
    const mimetype = imageTypes.test(file.mimetype);
    const extname = imageTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    return cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed for images!'));
  }
  
  // Check if it's a resource file
  if (file.fieldname.startsWith('resourceFiles[')) {
    const resourceTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx/;
    const mimetype = file.mimetype.includes('pdf') || 
                    file.mimetype.includes('document') || 
                    file.mimetype.includes('spreadsheet') || 
                    file.mimetype.includes('presentation') ||
                    file.mimetype.includes('application/vnd.openxmlformats') ||
                    file.mimetype.includes('application/msword') ||
                    file.mimetype.includes('application/vnd.ms-excel') ||
                    file.mimetype.includes('application/vnd.ms-powerpoint');
    const extname = resourceTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF, DOC, XLS, or PPT files are allowed for resources!'));
  }

  // If it's neither image nor resource file, reject it
  cb(new Error('Invalid field name for file upload!'));
};

// Setup lesson files upload middleware - FIXED: Use .any() instead of .array('files')
export const uploadLessonFiles = multer({
  storage,
  limits: { 
    fileSize: 80 * 1024 * 1024, // 20MB limit for lesson files
    files: 20 // Max 20 files
  },
  fileFilter: lessonFileFilter
}).any(); // Changed from .array('files') to .any() to handle dynamic field names