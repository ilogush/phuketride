import { useState, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface DocumentPhotosUploadProps {
    onPassportPhotosChange: (photos: Array<{ base64: string; fileName: string }>) => void;
    onDriverLicensePhotosChange: (photos: Array<{ base64: string; fileName: string }>) => void;
}

export default function DocumentPhotosUpload({
    onPassportPhotosChange,
    onDriverLicensePhotosChange,
}: DocumentPhotosUploadProps) {
    const [passportPreviews, setPassportPreviews] = useState<Array<{ id: string; base64: string; fileName: string }>>([]);
    const [driverLicensePreviews, setDriverLicensePreviews] = useState<Array<{ id: string; base64: string; fileName: string }>>([]);
    const passportInputRef = useRef<HTMLInputElement>(null);
    const driverLicenseInputRef = useRef<HTMLInputElement>(null);

    const handlePassportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (passportPreviews.length + files.length > 2) {
            return;
        }

        const newPhotos: Array<{ id: string; base64: string; fileName: string }> = [];
        let processedCount = 0;

        files.forEach((file) => {
            if (!file.type.startsWith("image/")) {
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
                    const updatedPreviews = [...passportPreviews, ...newPhotos];
                    setPassportPreviews(updatedPreviews);
                    onPassportPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })));
                }
            };
            reader.readAsDataURL(file);
        });

        if (passportInputRef.current) {
            passportInputRef.current.value = "";
        }
    };

    const handleDriverLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (driverLicensePreviews.length + files.length > 2) {
            return;
        }

        const newPhotos: Array<{ id: string; base64: string; fileName: string }> = [];
        let processedCount = 0;

        files.forEach((file) => {
            if (!file.type.startsWith("image/")) {
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
                    const updatedPreviews = [...driverLicensePreviews, ...newPhotos];
                    setDriverLicensePreviews(updatedPreviews);
                    onDriverLicensePhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })));
                }
            };
            reader.readAsDataURL(file);
        });

        if (driverLicenseInputRef.current) {
            driverLicenseInputRef.current.value = "";
        }
    };

    const handleRemovePassport = (id: string) => {
        const updatedPreviews = passportPreviews.filter((p) => p.id !== id);
        setPassportPreviews(updatedPreviews);
        onPassportPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })));
    };

    const handleRemoveDriverLicense = (id: string) => {
        const updatedPreviews = driverLicensePreviews.filter((p) => p.id !== id);
        setDriverLicensePreviews(updatedPreviews);
        onDriverLicensePhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })));
    };

    return (
        <div className="flex">
            {/* Passport Photos - left aligned */}
            <div className="w-1/3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Passport Photos</h4>
                <div className="flex items-center gap-2">
                    {passportPreviews.map((photo) => (
                        <div
                            key={photo.id}
                            className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50"
                        >
                            <img
                                src={photo.base64}
                                alt={photo.fileName}
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemovePassport(photo.id)}
                                className="absolute top-0 right-0 w-3.5 h-3.5 bg-white/90 rounded-bl-md flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <XMarkIcon className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    ))}
                    {passportPreviews.length < 2 && (
                        <button
                            type="button"
                            onClick={() => passportInputRef.current?.click()}
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
                    <span className="text-xs text-gray-400 ml-1">
                        ({passportPreviews.length}/2)
                    </span>
                </div>
                <input
                    ref={passportInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePassportFileChange}
                    className="hidden"
                />
            </div>

            {/* Driver License Photos - center */}
            <div className="w-1/3 flex justify-center">
                <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Driver License Photos</h4>
                    <div className="flex items-center gap-2">
                        {driverLicensePreviews.map((photo) => (
                            <div
                                key={photo.id}
                                className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50"
                            >
                                <img
                                    src={photo.base64}
                                    alt={photo.fileName}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveDriverLicense(photo.id)}
                                    className="absolute top-0 right-0 w-3.5 h-3.5 bg-white/90 rounded-bl-md flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                                >
                                    <XMarkIcon className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ))}
                        {driverLicensePreviews.length < 2 && (
                            <button
                                type="button"
                                onClick={() => driverLicenseInputRef.current?.click()}
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
                        <span className="text-xs text-gray-400 ml-1">
                            ({driverLicensePreviews.length}/2)
                        </span>
                    </div>
                    <input
                        ref={driverLicenseInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleDriverLicenseFileChange}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Empty space for balance */}
            <div className="w-1/3"></div>
        </div>
    );
}
