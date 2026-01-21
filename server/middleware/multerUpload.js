const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/logos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-randomstring-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    // Allowed mime types
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
    }
};

// Create multer instance with configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
});

// Middleware to handle single file upload with field name 'logo'
const uploadLogo = upload.single('logo');

// Custom middleware to wrap multer and handle errors gracefully
const handleLogoUpload = (req, res, next) => {
    uploadLogo(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer-specific errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    status: false,
                    message: 'File size too large. Maximum allowed size is 5MB'
                });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    status: false,
                    message: 'Unexpected file field. Expected field: logo'
                });
            }
            return res.status(400).json({
                status: false,
                message: err.message || 'File upload error'
            });
        } else if (err) {
            // Custom errors from fileFilter
            return res.status(400).json({
                status: false,
                message: err.message || 'File upload error'
            });
        }

        // File upload successful, proceed to next middleware
        next();
    });
};

module.exports = handleLogoUpload;
