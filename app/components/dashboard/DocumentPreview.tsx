import { memo } from "react";

export interface DocumentPhoto {
    base64: string;
    fileName: string;
}

interface DocumentPreviewProps {
    photos: DocumentPhoto[] | null;
    label: string;
    maxPhotos?: number;
    className?: string;
}

const DocumentPreview = memo(function DocumentPreview({
    photos,
    label,
    maxPhotos = 2,
    className = "",
}: DocumentPreviewProps) {
    const hasPhotos = photos && photos.length > 0;

    return (
        <div className={className}>
            <h4 className="text-sm font-medium text-gray-900 mb-2">{label}</h4>
            {!hasPhotos ? (
                <span className="text-xs text-gray-400">No photos uploaded</span>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    {photos.map((photo, index) => (
                        <div
                            key={index}
                            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-50"
                        >
                            <img
                                src={photo.base64}
                                alt={photo.fileName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                        ({photos.length}/{maxPhotos})
                    </span>
                </div>
            )}
        </div>
    );
});

export default DocumentPreview;
