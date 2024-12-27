import multer from "multer";
import path from "path";
import { randomBytes } from "crypto";

// Configure multer for storing uploads
const storage = multer.diskStorage({
  destination: "uploads/avatars",
  filename: (_req, file, cb) => {
    // Generate a random filename while keeping the original extension
    const uniqueSuffix = randomBytes(16).toString("hex");
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Create multer instance with configuration
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and GIF are allowed."));
    }
  },
});
