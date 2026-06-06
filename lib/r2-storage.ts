import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const getR2Client = () => {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error("Cloudflare R2 credentials not configured");
    }

    return new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
};

/**
 * Upload a file to Cloudflare R2
 * @param buffer - File buffer to upload
 * @param filename - Filename with path (e.g., "images/123.png")
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
    buffer: Buffer,
    filename: string,
    contentType: string
): Promise<{ url: string; key: string }> {
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (!bucketName || !publicUrl) {
        throw new Error("R2_BUCKET_NAME and R2_PUBLIC_URL environment variables required");
    }

    const r2Client = getR2Client();

    await r2Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: buffer,
            ContentType: contentType,
        })
    );

    const url = `${publicUrl}/${filename}`;
    return { url, key: filename };
}

/**
 * Download file from URL and return as buffer
 */
export async function downloadFile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    return { buffer, contentType };
}

/**
 * Generate unique filename for R2 storage
 */
export function generateR2Filename(prefix: string, extension: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${prefix}/${timestamp}-${randomStr}.${extension}`;
}

/**
 * Delete a file from Cloudflare R2 by its key
 */
export async function deleteFromR2(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) throw new Error("R2_BUCKET_NAME environment variable required");
    const r2Client = getR2Client();
    await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}
