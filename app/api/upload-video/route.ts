import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { withCsrfProtection } from "@/lib/csrf";

// Cloudflare R2 configuration
// User needs to set these environment variables:
// R2_ACCOUNT_ID - Cloudflare account ID
// R2_ACCESS_KEY_ID - R2 access key
// R2_SECRET_ACCESS_KEY - R2 secret key
// R2_BUCKET_NAME - R2 bucket name
// R2_PUBLIC_URL - Public URL for the bucket (e.g., https://pub-xxx.r2.dev)

const getR2Client = () => {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error("Cloudflare R2 credentials not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.");
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

export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        const validTypes = ["video/mp4", "video/quicktime", "video/x-msvideo"];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type. Only MP4, MOV, and AVI are allowed." }, { status: 400 });
        }

        // Validate file size (100MB max as per Kling API docs)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File too large. Maximum size is 100MB." }, { status: 400 });
        }

        const bucketName = process.env.R2_BUCKET_NAME;
        const publicUrl = process.env.R2_PUBLIC_URL;

        if (!bucketName || !publicUrl) {
            return NextResponse.json({
                error: "Cloudflare R2 not configured. Please set R2_BUCKET_NAME and R2_PUBLIC_URL environment variables."
            }, { status: 500 });
        }

        const r2Client = getR2Client();

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split('.').pop() || 'mp4';
        const filename = `motion-videos/${timestamp}-${randomStr}.${extension}`;

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to R2
        await r2Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: buffer,
            ContentType: file.type,
        }));

        // Construct public URL
        const url = `${publicUrl}/${filename}`;

        console.log("Video uploaded successfully:", url);

        return NextResponse.json({
            url,
            filename,
            size: file.size,
            type: file.type,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to upload video" },
            { status: 500 }
        );
    }
    });
}
