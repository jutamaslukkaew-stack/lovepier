import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const client = new S3Client({ region: process.env.AWS_REGION });
const bucket = process.env.AWS_S3_BUCKET;
export const createUploadUrl = (key, contentType) => getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 900 });
export const createDownloadUrl = (key) => getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 900 });
