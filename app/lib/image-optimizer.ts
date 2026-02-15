// Client-side image optimization before upload
// Compresses images to reduce storage and bandwidth

export interface OptimizedImage {
    base64: string;
    fileName: string;
    originalSize: number;
    compressedSize: number;
}

export async function optimizeImage(
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
): Promise<OptimizedImage> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
                
                // Create canvas and compress
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                
                // Draw image with better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to WebP format
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob'));
                            return;
                        }
                        
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve({
                                base64: reader.result as string,
                                fileName: file.name.replace(/\.(jpg|jpeg|png)$/i, '.webp'),
                                originalSize: file.size,
                                compressedSize: blob.size,
                            });
                        };
                        reader.readAsDataURL(blob);
                    },
                    'image/webp',
                    quality
                );
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

export async function optimizeImages(
    files: FileList | File[],
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
): Promise<OptimizedImage[]> {
    const fileArray = Array.from(files);
    const promises = fileArray.map(file => optimizeImage(file, maxWidth, maxHeight, quality));
    return Promise.all(promises);
}

// Thumbnail generation for previews
export async function generateThumbnail(
    file: File,
    size: number = 200
): Promise<string> {
    const optimized = await optimizeImage(file, size, size, 0.7);
    return optimized.base64;
}

// Calculate compression ratio
export function getCompressionRatio(original: number, compressed: number): string {
    const ratio = ((original - compressed) / original) * 100;
    return `${ratio.toFixed(1)}%`;
}

// Format file size
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
