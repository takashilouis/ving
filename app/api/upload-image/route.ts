import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { withCsrfProtection } from "@/lib/csrf";

const getR2Client = () => {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error("R2 credentials not configured");
    }
    return new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
};

export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            const formData = await req.formData();
            const file = formData.get("file") as File;
            if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

            const validTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
            if (!validTypes.includes(file.type)) {
                return NextResponse.json(
                    { error: "Invalid file type. PNG, JPG, WEBP, GIF only." },
                    { status: 400 }
                );
            }

            const maxSize = 20 * 1024 * 1024; // 20MB
            if (file.size > maxSize) {
                return NextResponse.json({ error: "File too large. Maximum 20MB." }, { status: 400 });
            }

            const bucketName = process.env.R2_BUCKET_NAME;
            const publicUrl = process.env.R2_PUBLIC_URL;
            if (!bucketName || !publicUrl) {
                return NextResponse.json({ error: "R2 storage not configured" }, { status: 500 });
            }

            const r2Client = getR2Client();
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const extension = file.name.split(".").pop() || "png";
            const filename = `uploads/${timestamp}-${randomStr}.${extension}`;

            const buffer = Buffer.from(await file.arrayBuffer());
            await r2Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: filename,
                Body: buffer,
                ContentType: file.type,
            }));

            const url = `${publicUrl}/${filename}`;
            return NextResponse.json({ url, filename, size: file.size, type: file.type });
        } catch (error) {
            console.error("Image upload error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to upload image" },
                { status: 500 }
            );
        }
    });
}
