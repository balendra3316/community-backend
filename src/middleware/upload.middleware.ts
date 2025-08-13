
// import multer from 'multer';
// import path from 'path';


// const storage = multer.memoryStorage();


// const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   const filetypes = /jpeg|jpg|png|gif/;
//   const mimetype = filetypes.test(file.mimetype);
//   const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//   if (mimetype && extname) {
//     return cb(null, true);
//   }
//   cb(new Error('Only image files are allowed!'));
// };


// export const upload = multer({
//   storage,
//   limits: { fileSize: 20 * 1024 * 1024 }, 
//   fileFilter
// });


// const lessonFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {

//   if (file.fieldname.startsWith('imageFiles[')) {
//     const imageTypes = /jpeg|jpg|png|gif/;
//     const mimetype = imageTypes.test(file.mimetype);
//     const extname = imageTypes.test(path.extname(file.originalname).toLowerCase());

//     if (mimetype && extname) {
//       return cb(null, true);
//     }
//     return cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed for images!'));
//   }
  

//   if (file.fieldname.startsWith('resourceFiles[')) {
//     const resourceTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx/;
//     const mimetype = file.mimetype.includes('pdf') || 
//                     file.mimetype.includes('document') || 
//                     file.mimetype.includes('spreadsheet') || 
//                     file.mimetype.includes('presentation') ||
//                     file.mimetype.includes('application/vnd.openxmlformats') ||
//                     file.mimetype.includes('application/msword') ||
//                     file.mimetype.includes('application/vnd.ms-excel') ||
//                     file.mimetype.includes('application/vnd.ms-powerpoint');
//     const extname = resourceTypes.test(path.extname(file.originalname).toLowerCase());

//     if (mimetype && extname) {
//       return cb(null, true);
//     }
//     return cb(new Error('Only PDF, DOC, XLS, or PPT files are allowed for resources!'));
//   }


//   cb(new Error('Invalid field name for file upload!'));
// };


// export const uploadLessonFiles = multer({
//   storage,
//   limits: { 
//     fileSize: 80 * 1024 * 1024, // 20MB limit for lesson files
//     files: 20 // Max 20 files
//   },
//   fileFilter: lessonFileFilter
// }).any(); // Changed from .array('files') to .any() to handle dynamic field names








// middleware/upload.middleware.ts

import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

// This is your original, general-purpose file filter for single images.
// It remains unchanged.
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed!'));
};


// --- YOUR ORIGINAL UPLOAD OBJECT ---
// This is NOT modified. `upload.single('...')` will continue to work
// perfectly in all your other routes.
export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // Your original 20MB limit
  fileFilter
});


// --- NEW, SEPARATE MIDDLEWARE FOR POSTS ONLY ---

// A specific filter for the post media route that accepts images OR videos.
const postMediaFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const imageTypes = /jpeg|jpg|png|gif/;
    const videoTypes = /mp4|mov|avi|webm|mkv/;

    if (file.fieldname === 'image' && imageTypes.test(file.mimetype)) {
        return cb(null, true);
    }
    if (file.fieldname === 'video' && videoTypes.test(path.extname(file.originalname).toLowerCase())) {
        return cb(null, true);
    }
    
    // If the file doesn't match the expected fieldname and type, reject it.
    return cb(new Error('Unsupported file type or fieldname for the post media route.'));
};

// We create and export a new, pre-configured middleware specifically for handling
// the 'image' and 'video' fields in your post creation/update forms.
export const uploadPostMedia = multer({
    storage: storage,
    fileFilter: postMediaFileFilter,
    limits: { fileSize: 300 * 1024 * 1024 } // 300MB limit for videos
}).fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);



// The rest of your upload middleware (lessonFileFilter, etc.) remains unchanged.
const lessonFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.fieldname.startsWith('imageFiles[')) {
    const imageTypes = /jpeg|jpg|png|gif/;
    const mimetype = imageTypes.test(file.mimetype);
    const extname = imageTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    return cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed for images!'));
  }
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
  cb(new Error('Invalid field name for file upload!'));
};
export const uploadLessonFiles = multer({
  storage,
  limits: { 
    fileSize: 80 * 1024 * 1024,
    files: 20
  },
  fileFilter: lessonFileFilter
}).any();
