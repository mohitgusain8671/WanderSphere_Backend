import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';

// Configure AWS S3
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

// Configure multer for S3 upload
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const fileExtension = file.originalname.split('.').pop();
            const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
            
            // Organize files in folders based on type
            let folder = 'others';
            if (file.mimetype.startsWith('image/')) {
                folder = 'images';
            } else if (file.mimetype.startsWith('video/')) {
                folder = 'videos';
            }
            
            cb(null, `${folder}/${fileName}`);
        }
    }),
    fileFilter: function (req, file, cb) {
        // Accept images and videos only
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed!'), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    }
});

// Function to delete file from S3
const deleteFromS3 = async (fileUrl) => {
    try {
        const key = fileUrl.split('/').slice(-2).join('/'); // Get the key from URL
        
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key
        };
        
        await s3.deleteObject(params).promise();
        return true;
    } catch (error) {
        console.error('Error deleting file from S3:', error);
        return false;
    }
};

export { upload, deleteFromS3, s3 };