import multer from 'multer';

// Memory Storage Configuration for Direct S3 Streaming
const storage = multer.memoryStorage();

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

// Multer Instance with 10MB Limit
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB Limit
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
                        message: 'File size limit exceeded. Maximum allowed size is 10MB.'
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
