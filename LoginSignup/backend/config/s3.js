import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

export const getS3Client = () => {
  dotenv.config();

  return new S3Client({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

export const getBucketName = () => process.env.AWS_S3_BUCKET_NAME || "my-app001";
export const getAwsRegion = () => process.env.AWS_REGION || "ap-southeast-1";

export const uploadToS3 = async (fileBuffer, fileName, mimeType = "application/octet-stream", folder = "Tayyab/lms-videos") => {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const key = `${cleanFolder}/${Date.now()}-${fileName.replace(/\s+/g, "_")}`;
  const bucket = getBucketName();
  const region = getAwsRegion();
  
  const params = {
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  const client = getS3Client();
  const command = new PutObjectCommand(params);
  await client.send(command);

  return {
    s3Url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    key
  };
};

export const uploadChunkToS3 = async (chunkBuffer, uploadId, chunkIndex, folder = "Tayyab/lms-videos/chunks") => {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const key = `${cleanFolder}/${uploadId}/chunk_${chunkIndex}`;
  const bucket = getBucketName();

  const params = {
    Bucket: bucket,
    Key: key,
    Body: chunkBuffer,
    ContentType: "application/octet-stream",
  };

  const client = getS3Client();
  const command = new PutObjectCommand(params);
  await client.send(command);

  return key;
};

export const mergeS3Chunks = async (uploadId, totalChunks, finalFileName, folder = "Tayyab/lms-videos") => {
  const client = getS3Client();
  const bucket = getBucketName();
  const region = getAwsRegion();
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const finalKey = `${cleanFolder}/${Date.now()}-${finalFileName.replace(/\s+/g, "_")}`;
  const chunksFolder = `Tayyab/lms-videos/chunks/${uploadId}`;

  // Download all chunk buffers from S3 in sequence
  const chunkBuffers = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkKey = `${chunksFolder}/chunk_${i}`;
    const command = new GetObjectCommand({ Bucket: bucket, Key: chunkKey });
    const response = await client.send(command);
    
    // Read stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    chunkBuffers.push(Buffer.concat(chunks));
  }

  // Concatenate buffers into full video buffer
  const finalBuffer = Buffer.concat(chunkBuffers);

  // Upload final merged video object to S3
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: finalKey,
    Body: finalBuffer,
    ContentType: "video/mp4",
  });
  await client.send(putCommand);

  // Clean up temporary chunk objects from S3
  try {
    const deleteKeys = [];
    for (let i = 0; i < totalChunks; i++) {
      deleteKeys.push({ Key: `${chunksFolder}/chunk_${i}` });
    }
    if (deleteKeys.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: deleteKeys }
      });
      await client.send(deleteCommand);
    }
  } catch (cleanErr) {
    console.error("Warning: Failed to clean up chunk files from S3:", cleanErr.message);
  }

  return {
    s3Url: `https://${bucket}.s3.${region}.amazonaws.com/${finalKey}`,
    fileKey: finalKey,
    fileSize: finalBuffer.length
  };
};

export const getS3ObjectMetadata = async (key) => {
  const client = getS3Client();
  const command = new HeadObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });
  return await client.send(command);
};

export const streamS3Object = async (key, rangeHeader = null) => {
  const client = getS3Client();
  const params = {
    Bucket: getBucketName(),
    Key: key,
  };

  if (rangeHeader) {
    params.Range = rangeHeader;
  }

  const command = new GetObjectCommand(params);
  return await client.send(command);
};

export const getPresignedDownloadUrl = async (key, expiresInSeconds = 86400) => {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });
  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
};

export const deleteFromS3 = async (fileKeyOrUrl) => {
  let key = fileKeyOrUrl;
  if (fileKeyOrUrl.startsWith("http")) {
    const urlObj = new URL(fileKeyOrUrl);
    key = urlObj.pathname.substring(1);
  }

  const params = {
    Bucket: getBucketName(),
    Key: key,
  };

  const client = getS3Client();
  const command = new DeleteObjectCommand(params);
  await client.send(command);
};

export const getPresignedUploadUrl = async (fileName, fileType, folder = "Tayyab/lms-videos", expiresInSeconds = 300) => {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const key = `${cleanFolder}/${Date.now()}-${fileName.replace(/\s+/g, "_")}`;
  const bucket = getBucketName();
  const region = getAwsRegion();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: fileType,
  });

  const client = getS3Client();
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl, key };
};
