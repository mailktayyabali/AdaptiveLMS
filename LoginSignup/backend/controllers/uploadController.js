import { uploadToS3, getPresignedUploadUrl } from "../config/s3.js";

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const folder = req.body.folder || "Tayyab";

    const fileUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    ); 

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully to S3",
      url: fileUrl,
      fileName: req.file.originalname,
      folder,
    });
  } catch (error) {
    console.error("S3 Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload file to S3",
      error: error.message,
    });
  }
};

export const getPresignedUrl = async (req, res) => {
  try {
    const { fileName, fileType, folder } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ success: false, message: "fileName and fileType are required" });
    }

    const result = await getPresignedUploadUrl(
      fileName,
      fileType,
      folder || "Tayyab"
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate presigned URL",
      error: error.message,
    });
  }
};
