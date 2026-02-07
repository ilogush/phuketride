import { useState, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface PhotoUploadSectionProps {
    label: string;
    maxPhotos: number;
    onPhotosChange: (photos: Array<{ base64: string; fileName: string }>) => void;
}

export default function PhotoUploadSection({
    label,
    maxPhotos,
    onPhotosChange,
}: PhotoUploadSectionProps) {
    const [previews, setPreviews] = useState<Array<{ id: string; base64: string; fileName: string }>>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (previews.length + files.length > maxPhotos) {
            setError(`Maximum ${maxPhotos} photos allowed`);
            return;
        }

        setError(null);

        const newPhotos: Array<{ id: string; base64: string; fileName: string }> = [];
        let processedCount = 0;

        files.forEach((file) => {
            if (!file.type.startsWith("image/")) {
                setError("Please select image files only");
                processedCount++;
                return;
            }

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
        <div className="flex items-center gap-4">
            {/* Label */}
            <span className="text-sm font-medium text-gray-900 whitespace-nowrap min-w-[140px]">
                {label}
            </span>

            {/* Photos */}
            <div className="flex items-center gap-2">
                {previews.map((photo) => (
                    <div
                        key={photo.id}
                        className="relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
                    >
                        <img
                            src={photo.base64}
                            alt={photo.fileName}
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => handleRemove(photo.id)}
                            className="absolute top-0 right-0 w-3.5 h-3.5 bg-white/90 rounded-bl-md flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                        >
                            <XMarkIcon className="w-2.5 h-2.5" />
                        </button>
                    </div>
                ))}

                {/* Upload button */}
                {previews.length < maxPhotos && (
                    <button
                        type="button"
                        onClick={handleClick}
                        className="w-20 h-20 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors rounded-lg flex items-center justify-center cursor-pointer"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="w-4 h-4 text-gray-400"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                            />
                        </svg>
                    </button>
                )}
            </div>

            {/* Counter */}
            <span className="text-xs text-gray-400 whitespace-nowrap">
                ({previews.length}/{maxPhotos})
            </span>

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
