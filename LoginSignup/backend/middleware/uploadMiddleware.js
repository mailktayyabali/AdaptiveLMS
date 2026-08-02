import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure storage directories exist
const originalsDir = path.join(process.cwd(), 'uploads', 'originals');
const thumbnailsDir = path.join(process.cwd(), 'uploads', 'thumbnails');

if (!fs.existsSync(originalsDir)) {
    fs.mkdirSync(originalsDir, { recursive: true });
}
if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Multer Storage Configuration - Uses UUID to prevent collision & path traversal
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, originalsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeFilename = `${crypto.randomUUID()}${ext}`;
        cb(null, safeFilename);
    }
});

// File Type Filter: Allowed MIME Types
const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
];

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF, and PDF files are allowed.'), false);
    }
};

// Multer Instance with 5MB Limit
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB Limit
    }
});

// Middleware Wrapper with Error Handling
export const handleSingleUpload = (fieldName) => {
    return (req, res, next) => {
        const uploadSingle = upload.single(fieldName);

        uploadSingle(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File size limit exceeded. Maximum allowed size is 5MB.'
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: `File upload error: ${err.message}`
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    };
};
