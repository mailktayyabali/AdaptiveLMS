import express from "express";
import multer from "multer";
import { uploadFile, getPresignedUrl } from "../controllers/uploadController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/upload", authenticateToken, upload.single("image"), uploadFile);
router.post("/upload/presigned-url", authenticateToken, getPresignedUrl);

export default router;
