import { useState, useRef } from "react"
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { optimizeImage } from "~/lib/image-optimizer"
import Button from "~/components/dashboard/Button"

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
            base64: photo.startsWith('data:') ? photo : photo, // Keep URL as is
            fileName: `photo-${index}`,
        }))
    )
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        if (previews.length + files.length > maxPhotos) {
            return
        }

        const newPhotos: Array<{ id: string; base64: string; fileName: string }> = []

        for (const file of files) {
            if (!file.type.startsWith("image/")) {
                continue
            }

            try {
                const optimized = await optimizeImage(file, 1200, 800, 0.85)
                const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
                newPhotos.push({ 
                    id, 
                    base64: optimized.base64, 
                    fileName: optimized.fileName 
                })
            } catch {
                // Ignore single-file optimization errors to keep upload flow resilient.
            }
        }

        const updatedPreviews = [...previews, ...newPhotos]
        setPreviews(updatedPreviews)
        onPhotosChange(updatedPreviews.map((p) => ({ base64: p.base64, fileName: p.fileName })))

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
                    <Button
                        type="button"
                        variant="unstyled"
                        onClick={() => handleRemove(photo.id)}
                        className="absolute top-1 right-1 w-6 h-6 !p-0 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </Button>
                </div>
            ))}
            {previews.length < maxPhotos && (
                <Button
                    type="button"
                    variant="unstyled"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors rounded-lg flex flex-col items-center justify-center cursor-pointer gap-2"
                >
                    <PlusIcon className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400">
                        {previews.length}/{maxPhotos}
                    </span>
                </Button>
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
