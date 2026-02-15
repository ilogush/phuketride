/**
 * R2 Storage utilities for file uploads
 * Handles avatar and car photo uploads to Cloudflare R2 bucket
 */

export async function uploadToR2(
    bucket: R2Bucket,
    base64Data: string,
    path: string
): Promise<string> {
    // Extract base64 content and mime type
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error("Invalid base64 data");
    }

    const base64Content = matches[2];

    // Generate safe filename: extract directory and create new filename
    const pathParts = path.split('/');
    const directory = pathParts.slice(0, -1).join('/'); // e.g., "cars/123"
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const storageFileName = `${directory}/photo-${timestamp}-${random}.webp`;

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to R2
    await bucket.put(storageFileName, bytes.buffer, {
        httpMetadata: {
            contentType: 'image/webp',
        },
    });

    // Return public URL
    return `/assets/${storageFileName}`;
}

export async function uploadAvatarFromBase64(
    bucket: R2Bucket,
    userId: string,
    base64Data: string,
    fileName: string
): Promise<string> {
    // Extract base64 content and mime type
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error("Invalid base64 data");
    }

    const mimeType = matches[1];
    const base64Content = matches[2];

    // Determine file extension
    const fileExtension = fileName.split(".").pop() || "jpg";
    const storageFileName = `avatars/${userId}.${fileExtension}`;

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to R2
    await bucket.put(storageFileName, bytes.buffer, {
        httpMetadata: {
            contentType: mimeType,
        },
    });

    // Return public URL
    return `/assets/${storageFileName}`;
}

export async function deleteAvatar(
    bucket: R2Bucket,
    avatarUrl: string
): Promise<void> {
    if (!avatarUrl) return;

    // Extract file path from URL
    const fileName = avatarUrl.replace("/assets/", "");
    await bucket.delete(fileName);
}
