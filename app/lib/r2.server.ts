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

    const base64Content = matches[2];

    const timestamp = Date.now();
    const storageFileName = `avatars/${userId}-${timestamp}.webp`;

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to R2
    await bucket.put(storageFileName, bytes.buffer, {
        httpMetadata: {
            contentType: "image/webp",
        },
    });

    // Return public URL
    return `/assets/${storageFileName}`;
}

export interface UploadPhotoItem {
    base64: string;
    fileName: string;
}

function isAssetUrl(value: string): boolean {
    return value.startsWith("/assets/") || value.startsWith("http://") || value.startsWith("https://");
}

export async function uploadPhotoItemsToR2(
    bucket: R2Bucket,
    photos: UploadPhotoItem[],
    directory: string
): Promise<UploadPhotoItem[]> {
    const tasks = photos
        .filter((photo) => !!photo?.base64)
        .map(async (photo) => {
            if (isAssetUrl(photo.base64)) {
                return photo;
            }
            const safeName = photo.fileName || "photo.webp";
            const uploadedUrl = await uploadToR2(bucket, photo.base64, `${directory}/${safeName}`);
            return {
                base64: uploadedUrl,
                fileName: safeName.replace(/\.[^.]+$/i, ".webp"),
            } satisfies UploadPhotoItem;
        });
    return Promise.all(tasks);
}

export function parseAssetKey(assetUrl: string): string | null {
    if (!assetUrl) return null;
    const cleaned = assetUrl.split("?")[0].split("#")[0];
    if (cleaned.startsWith("/assets/")) return cleaned.replace("/assets/", "");
    try {
        const url = new URL(cleaned);
        const marker = "/assets/";
        const idx = url.pathname.indexOf(marker);
        if (idx >= 0) return url.pathname.slice(idx + marker.length);
    } catch {
    }
    return null;
}

export async function deleteAssetUrls(bucket: R2Bucket, assetUrls: string[]): Promise<void> {
    const keys = assetUrls
        .map(parseAssetKey)
        .filter((k): k is string => Boolean(k));
    if (keys.length === 0) return;
    await Promise.all(keys.map((key) => bucket.delete(key)));
}

export async function deleteAvatar(
    bucket: R2Bucket,
    avatarUrl: string
): Promise<void> {
    const key = parseAssetKey(avatarUrl);
    if (!key) return;
    await bucket.delete(key);
}
