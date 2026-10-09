/**
 * F-TECH-Student-Hub Upload Validation Middleware
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'private-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  }
});

// File filter
const allowedExtensions = (process.env.ALLOWED_EXTENSIONS || 'pdf,doc,docx,ppt,pptx,zip,png,jpg,jpeg').split(',');
const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25) * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed formats: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter
});

function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: `File exceeds maximum allowed size of ${process.env.MAX_FILE_SIZE_MB || 25}MB` });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
}

module.exports = {
  upload,
  handleUploadErrors
};
