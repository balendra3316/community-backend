// // src/middleware/upload.middleware.ts
// import multer from 'multer';
// import path from 'path';

// // Configure multer for memory storage
// const storage = multer.memoryStorage();

// // Filter for accepting only image files
// const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   const filetypes = /jpeg|jpg|png|gif/;
//   const mimetype = filetypes.test(file.mimetype);
//   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//   if (mimetype && extname) {
//     return cb(null, true);
//   }
//   cb(new Error('Only image files are allowed!'));
// };

// // Setup upload middleware
// export const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//   fileFilter
// });



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

// Filter for accepting image files for lessons
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'imageFiles') {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed for images!'));
  } else {
    cb(null, true);
  }
};

// Filter for accepting resource files (PDFs and DOCs)
const resourceFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname === 'resourceFiles') {
    const filetypes = /pdf|doc|docx|xls|xlsx|ppt|pptx/;
    const mimetype = file.mimetype.includes('pdf') || 
                    file.mimetype.includes('doc') || 
                    file.mimetype.includes('xls') || 
                    file.mimetype.includes('ppt') ||
                    file.mimetype.includes('application/vnd.openxmlformats');
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, XLS, or PPT files are allowed for resources!'));
  } else {
    cb(null, true);
  }
};

// Setup upload middleware for lesson resources and images
// export const uploadLessonFiles = multer({
//   storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
//   fileFilter: (req, file, cb) => {
//     if (file.fieldname === 'imageFiles') {
//       imageFileFilter(req, file, cb);
//     } else if (file.fieldname === 'resourceFiles') {
//       resourceFileFilter(req, file, cb);
//     } else {
//       cb(null, false);
//     }
//   }
// }).fields([
//   { name: 'imageFiles', maxCount: 10 },
//   { name: 'resourceFiles', maxCount: 10 }
// ]);





// Updated upload middleware for lesson files
export const uploadLessonFiles = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.fieldname.startsWith('imageFiles[')) {
      imageFileFilter(req, file, cb);
    } else if (file.fieldname.startsWith('resourceFiles[')) {
      resourceFileFilter(req, file, cb);
    } else {
      cb(null, false);
    }
  }
}).any(); // Use .any() to handle dynamic field names