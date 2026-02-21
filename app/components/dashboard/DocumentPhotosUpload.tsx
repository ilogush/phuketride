import { useState, useRef } from "react"
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline"
import Button from "~/components/dashboard/Button"

interface DocumentPhotosUploadProps {
    currentPhotos?: string[]
    onPhotosChange: (photos: Array<{ base64: string; fileName: string }>) => void
    maxPhotos?: number
    label?: string
}

export default function DocumentPhotosUpload({
    currentPhotos = [],
    onPhotosChange,
    maxPhotos = 3,
    label = "Add"
}: DocumentPhotosUploadProps) {
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
        <div className="w-full">
            <div className="flex gap-2 overflow-x-auto">
                {previews.map((photo) => (
                    <div
                        key={photo.id}
                        className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-50"
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
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors flex-shrink-0 w-20 h-20 rounded-lg">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <div className="flex flex-col items-center text-gray-500 text-center px-1">
                            <PhotoIcon className="w-6 h-6 mb-1" />
                            <span className="text-[10px] leading-tight">
                                {label} ({previews.length}/{maxPhotos})
                            </span>
                        </div>
                    </label>
                )}
            </div>
        </div>
    )
}
