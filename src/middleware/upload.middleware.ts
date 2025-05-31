


import multer from 'multer';
import path from 'path';


const storage = multer.memoryStorage();


const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed!'));
};


export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});


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
    fileSize: 80 * 1024 * 1024, // 20MB limit for lesson files
    files: 20 // Max 20 files
  },
  fileFilter: lessonFileFilter
}).any(); // Changed from .array('files') to .any() to handle dynamic field names