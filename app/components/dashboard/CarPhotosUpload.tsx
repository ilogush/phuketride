import { useState, useRef } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"

interface CarPhotosUploadProps {
    currentPhotos?: string[]
    onPhotosChange: (photos: Array<{ base64: string; fileName: string }>) => void
    maxPhotos?: number
}

export default function CarPhotosUpload({
    currentPhotos = [],
    onPhotosChange,
    maxPhotos = 12,
}: CarPhotosUploadProps) {
    const [previews, setPreviews] = useState<Array<{ id: string; base64: string; fileName: string }>>(
        currentPhotos.map((photo, index) => ({
            id: `existing-${index}`,
            base64: photo,
            fileName: `photo-${index}`,
        }))
    )
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        if (previews.length + files.length > maxPhotos) {
            return
        }

        const newPhotos: Array<{ id: string; base64: string; fileName: string }> = []
        let processedCount = 0

        files.forEach((file) => {
            if (!file.type.startsWith("image/")) {
                processedCount++
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                const base64 = reader.result as string
                const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
                newPhotos.push({ id, base64, fileName: file.name })

                processedCount++
                if (processedCount === files.length) {
                    const updatedPreviews = [...previews, ...newPhotos]
                    setPreviews(updatedPreviews)
                    onPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })))
                }
            }
            reader.readAsDataURL(file)
        })

        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleRemove = (id: string) => {
        const updatedPreviews = previews.filter((p) => p.id !== id)
        setPreviews(updatedPreviews)
        onPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })))
    }

    return (
        <div className="flex flex-wrap gap-4">
            {previews.map((photo) => (
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
                        onClick={() => handleRemove(photo.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-white transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            ))}
            {previews.length < maxPhotos && (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors rounded-lg flex flex-col items-center justify-center cursor-pointer gap-2"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-8 h-8 text-gray-400"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                        />
                    </svg>
                    <span className="text-xs text-gray-400">
                        {previews.length}/{maxPhotos}
                    </span>
                </button>
            )}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    )
}
