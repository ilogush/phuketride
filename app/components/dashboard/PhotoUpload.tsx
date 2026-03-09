import { useState, useRef } from "react";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Button from '~/components/shared/ui/Button';
import { optimizeImage } from "~/lib/image-optimizer";

interface PhotoUploadProps {
    currentPhotoUrl?: string | null;
    onPhotoChange: (base64: string | null, fileName: string | null) => void;
    maxSizeMB?: number;
    label?: string;
    initials?: string;
}

export default function PhotoUpload({
    currentPhotoUrl,
    onPhotoChange,
    maxSizeMB = 2,
    label,
    initials = "U",
}: PhotoUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setError("Please select an image file");
            return;
        }

        setError(null);

        try {
            const optimized = await optimizeImage(file, 800, 800, 0.85);
            setPreview(optimized.base64);
            onPhotoChange(optimized.base64, optimized.fileName);
        } catch {
            setError("Failed to process image");
        }
    };

    const handleRemove = () => {
        setPreview(null);
        setError(null);
        onPhotoChange(null, null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex items-center gap-3">
            <div className="relative w-20 h-20 flex-shrink-0">
                {preview ? (
                    <img
                        src={preview}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover"
                    />
                ) : (
                    <Button
                        type="button"
                        variant="plain"
                        onClick={handleClick}
                        className="w-20 h-20 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors rounded-full flex items-center justify-center cursor-pointer"
                    >
                        <ArrowUpTrayIcon className="w-6 h-6 text-gray-400" />
                    </Button>
                )}
                {preview && (
                    <Button
                        type="button"
                        variant="plain"
                        onClick={handleRemove}
                        className="absolute -top-1 -right-1 w-5 h-5 aspect-square !p-0 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    >
                        <XMarkIcon className="w-3 h-3" />
                    </Button>
                )}
            </div>
            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{label}</h3>
                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
}
