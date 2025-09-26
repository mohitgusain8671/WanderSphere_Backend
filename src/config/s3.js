import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

// ✅ Configure AWS S3 Client (v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ Configure multer for S3 upload
const upload = multer({
  storage: multerS3({
    s3: s3, // use the S3Client from v3
    bucket: process.env.AWS_S3_BUCKET_NAME,
    acl: "public-read",
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const fileExtension = file.originalname.split(".").pop();
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;

      // Organize files by type
      let folder = "others";
      if (file.mimetype.startsWith("image/")) folder = "images";
      else if (file.mimetype.startsWith("video/")) folder = "videos";

      cb(null, `${folder}/${fileName}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed!"), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// ✅ Delete file from S3 (v3)
const deleteFromS3 = async (fileUrl) => {
  try {
    // extract key like "images/filename.jpg"
    const key = fileUrl.split("/").slice(-2).join("/");

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    };

    await s3.send(new DeleteObjectCommand(params));
    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return false;
  }
};

export { upload, deleteFromS3, s3 };
