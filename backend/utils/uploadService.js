import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure the upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize naming using timestamp and cryptographically secure random bytes
    const randomHex = crypto.randomBytes(4).toString('hex');
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomHex}${fileExt}`);
  }
});

// Multer File Type Whitelist Filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPEG, and WEBP images are allowed.'), false);
  }
};

// Multer Configuration (Max size limit: 2MB)
export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB absolute limit
  }
}).single('image');

// Multer Configuration for Multiple Product Images (Max size limit: 2MB per file, max 10 files)
export const uploadProductImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB absolute limit
  }
}).array('images', 10);


// Ensure the screenshots upload directory exists
const screenshotDir = path.join(process.cwd(), 'uploads', 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Multer Storage Configuration for Screenshots
const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, screenshotDir);
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(4).toString('hex');
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `appeal-${Date.now()}-${randomHex}${fileExt}`);
  }
});

// Multer Configuration for Screenshots (Max size limit: 5MB)
export const uploadScreenshot = multer({
  storage: screenshotStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB absolute limit
  }
}).single('screenshot');

/**
 * Express middleware to strictly validate file magic bytes, name formats, and prevent code execution.
 */
export const verifyUploadMagicBytes = (req, res, next) => {
  const filesToCheck = [];
  if (req.file) filesToCheck.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToCheck.push(...req.files);
    } else {
      Object.values(req.files).forEach((list) => {
        if (Array.isArray(list)) filesToCheck.push(...list);
      });
    }
  }

  for (const file of filesToCheck) {
    try {
      const filePath = file.path;

      // 1. Strict Filename format & double extension block
      const baseName = file.originalname.toLowerCase();
      const ext = path.extname(baseName);
      const forbiddenExts = ['.php', '.js', '.sh', '.exe', '.bat', '.cmd', '.py', '.html', '.htm', '.jsp', '.asp', '.aspx', '.cgi'];
      
      const dotCount = (baseName.match(/\./g) || []).length;
      if (dotCount > 1) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Upload rejected: Double extensions are not allowed.' });
      }

      if (forbiddenExts.includes(ext) || baseName.includes('.php') || baseName.includes('.js')) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Upload rejected: Insecure file format.' });
      }

      // 2. Validate magic bytes (first 12 bytes of file content)
      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);

      const hex = buffer.toString('hex').toUpperCase();
      
      // Match exact hex headers: PNG, JPEG, WEBP (RIFF ... WEBP)
      const isPNG = hex.startsWith('89504E470D0A1A0A');
      const isJPEG = hex.startsWith('FFD8FF');
      const isWEBP = hex.startsWith('52494646') && hex.substring(16, 24) === '57454250'; // 'RIFF' at 0, 'WEBP' at 8 (index 16 in hex)

      if (!isPNG && !isJPEG && !isWEBP) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Upload rejected: File content does not match allowed image formats (PNG, JPEG, WEBP).' });
      }
    } catch (err) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ error: 'Failed to verify uploaded file content safety.' });
    }
  }

  next();
};
