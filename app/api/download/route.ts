import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type") || "application/octet-stream";

        // Extract filename from URL or use a default one
        let filename = searchParams.get("filename");
        if (!filename) {
            const urlParts = new URL(url).pathname.split("/");
            filename = urlParts[urlParts.length - 1] || "download";
        }

        // We can just stream the response body back with the appropriate headers.
        return new NextResponse(response.body, {
            headers: {
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Type": contentType,
            },
        });
    } catch (error) {
        console.error("Download proxy error:", error);
        return new NextResponse("Failed to download file", { status: 500 });
    }
}
