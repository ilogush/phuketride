import { useEffect, useMemo, useState } from "react";
import Button from "~/components/public/Button";
import {
  HeartIcon,
  ShareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

interface CarPhotoModalProps {
  isOpen: boolean;
  title: string;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function CarPhotoModal({
  isOpen,
  title,
  photos,
  initialIndex = 0,
  onClose,
}: CarPhotoModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(initialIndex);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [initialIndex, isOpen, onClose, photos.length]);

  const orderedPhotos = useMemo(() => {
    if (!photos.length) {
      return [];
    }
    const safeIndex = Math.max(0, Math.min(activeIndex, photos.length - 1));
    return [photos[safeIndex], ...photos.filter((_, index) => index !== safeIndex)];
  }, [activeIndex, photos]);

  if (!isOpen || !photos.length || !orderedPhotos.length) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-3 sm:p-6">
      <div className="mx-auto h-full max-w-7xl rounded-2xl bg-white p-3 sm:p-4 flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <div className="min-w-0 flex-1 text-center text-lg sm:text-xl font-semibold text-gray-800 truncate">
            {title} • 5 <StarIcon className="inline-block w-5 h-5 text-indigo-600 align-text-bottom" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" className="w-10 h-10 rounded-xl border border-indigo-600 text-indigo-600 bg-white">
              <HeartIcon className="w-5 h-5" />
            </Button>
            <Button type="button" className="w-9 h-9 rounded-full border border-gray-200 text-gray-800 bg-white">
              <ShareIcon className="w-5 h-5" />
            </Button>
            <Button type="button" onClick={onClose} className="w-9 h-9 rounded-full border border-gray-200 text-gray-800 bg-white">
              <XMarkIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {orderedPhotos.map((photo, index) => (
              <div
                key={`${photo}-${index}`}
                className={`rounded-xl overflow-hidden bg-gray-100 border border-gray-200 ${index === 0 ? "md:col-span-2" : ""}`}
              >
                <img
                  src={photo}
                  alt={`${title} ${index + 1}`}
                  className={index === 0 ? "w-full h-[340px] object-cover" : "w-full h-[220px] object-cover"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
