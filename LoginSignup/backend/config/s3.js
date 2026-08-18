import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

export const uploadToS3 = async (fileBuffer, fileName, mimeType = "application/octet-stream", folder = "Tayyab") => {
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

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
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

 export const getPresignedUploadUrl = async (fileName, fileType, folder = "Tayyab", expiresInSeconds = 300) => {
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
