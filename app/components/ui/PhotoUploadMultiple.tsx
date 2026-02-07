import { useState, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface PhotoUploadMultipleProps {
    onPhotosChange: (photos: Array<{ base64: string; fileName: string }>) => void;
    maxSizeMB?: number;
    label?: string;
    maxPhotos?: number;
}

export default function PhotoUploadMultiple({
    onPhotosChange,
    maxSizeMB = 5,
    label = "Photos",
    maxPhotos = 12,
}: PhotoUploadMultipleProps) {
    const [previews, setPreviews] = useState<Array<{ id: string; base64: string; fileName: string }>>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Check max photos
        if (previews.length + files.length > maxPhotos) {
            setError(`Maximum ${maxPhotos} photos allowed`);
            return;
        }

        setError(null);

        const newPhotos: Array<{ id: string; base64: string; fileName: string }> = [];
        let processedCount = 0;

        files.forEach((file) => {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                setError("Please select image files only");
                processedCount++;
                if (processedCount === files.length) {
                    if (newPhotos.length > 0) {
                        const updatedPreviews = [...previews, ...newPhotos];
                        setPreviews(updatedPreviews);
                        onPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })));
                    }
                }
                return;
            }

            // Validate file size
            const maxSizeBytes = maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
                setError(`File size must be less than ${maxSizeMB}MB`);
                processedCount++;
                if (processedCount === files.length) {
                    if (newPhotos.length > 0) {
                        const updatedPreviews = [...previews, ...newPhotos];
                        setPreviews(updatedPreviews);
                        onPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })));
                    }
                }
                return;
            }

            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                newPhotos.push({ id, base64, fileName: file.name });

                processedCount++;
                if (processedCount === files.length) {
                    const updatedPreviews = [...previews, ...newPhotos];
                    setPreviews(updatedPreviews);
                    onPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })));
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemove = (id: string) => {
        const updatedPreviews = previews.filter((p) => p.id !== id);
        setPreviews(updatedPreviews);
        onPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })));
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div>
            {error && (
                <p className="text-xs text-red-500 mb-3">{error}</p>
            )}

            <div className="grid grid-cols-12 gap-2">
                {/* Existing photos */}
                {previews.map((photo) => (
                    <div
                        key={photo.id}
                        className="relative aspect-square rounded-lg overflow-hidden bg-gray-50"
                    >
                        <img
                            src={photo.base64}
                            alt={photo.fileName}
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => handleRemove(photo.id)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                        >
                            <XMarkIcon className="w-2.5 h-2.5" />
                        </button>
                    </div>
                ))}

                {/* Upload button */}
                {previews.length < maxPhotos && (
                    <div
                        onClick={handleClick}
                        className="relative aspect-square border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors rounded-lg flex flex-col items-center justify-center cursor-pointer"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="w-5 h-5 text-gray-400 mb-0.5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                            />
                        </svg>
                        <span className="text-[10px] text-gray-400">Upload</span>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
}
