import { useState, useRef } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
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
    label = "User Avatar",
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
        <div className="inline-block">
            <div className="relative h-18 w-18">
                {preview ? (
                    <div className="relative h-full w-full overflow-hidden rounded-lg bg-gray-50">
                        <img
                            src={preview}
                            alt="Profile"
                            className="h-full w-full object-cover"
                        />
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="plain"
                        onClick={handleClick}
                        className="relative h-full w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-200 hover:bg-gray-50"
                    >
                        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
                            <PhotoIcon className="h-6 w-6 text-gray-500" />
                            <span className="block w-full text-center text-[10px] leading-tight text-gray-500">
                                {label}
                            </span>
                        </span>
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
            {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}

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
