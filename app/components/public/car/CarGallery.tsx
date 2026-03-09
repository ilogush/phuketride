import { useMemo, useState } from "react";
import { HeartIcon } from "@heroicons/react/24/outline";
import { PhotoIcon } from "@heroicons/react/24/outline";
import CarPhotoModal from "~/components/public/car/CarPhotoModal";

interface CarGalleryProps {
  title: string;
  photos: string[];
}

export default function CarGallery({ title, photos }: CarGalleryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIndexes, setFailedIndexes] = useState<number[]>([]);

  const allPhotos = useMemo(() => {
    const cleanPhotos = photos.filter(Boolean);
    return cleanPhotos;
  }, [photos]);
  const galleryPhotos = useMemo(
    () =>
      allPhotos
        .map((url, index) => ({ url, originalIndex: index }))
        .filter((entry) => !failedIndexes.includes(entry.originalIndex)),
    [allPhotos, failedIndexes],
  );

  if (!galleryPhotos.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-100 aspect-[4/3] flex items-center justify-center text-gray-500">
        No photos uploaded
      </div>
    );
  }

  const mainEntry = galleryPhotos[0];
  const secondEntry = galleryPhotos[1] || galleryPhotos[0];
  const thirdEntry = galleryPhotos[2] || galleryPhotos[0];

  const openModal = (index: number) => {
    setActiveIndex(index);
    setIsModalOpen(true);
  };

  const markFailed = (index: number) => {
    setFailedIndexes((prev) => (prev.includes(index) ? prev : [...prev, index]));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl overflow-hidden border border-gray-200 aspect-[4/3]">
          <button type="button" onClick={() => openModal(0)} className="block w-full h-full text-left leading-none">
            <img src={mainEntry.url} alt={title} className="block w-full h-full object-cover" onError={() => markFailed(mainEntry.originalIndex)} />
          </button>
        </div>

        <div className="flex flex-col gap-[18px]">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 aspect-[4/3]">
            <button type="button" onClick={() => openModal(1)} className="block w-full h-full text-left leading-none">
              <img src={secondEntry.url} alt={`${title} 2`} className="block w-full h-full object-cover" onError={() => markFailed(secondEntry.originalIndex)} />
            </button>
            <button
              type="button"
              className="absolute top-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#1f2937] bg-[#00b33c] text-white shadow-sm transition-colors hover:bg-[#009933]"
            >
              <HeartIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-gray-200 aspect-[4/3]">
            <button type="button" onClick={() => openModal(2)} className="block w-full h-full text-left leading-none">
              <img src={thirdEntry.url} alt={`${title} 3`} className="block w-full h-full object-cover" onError={() => markFailed(thirdEntry.originalIndex)} />
            </button>
            <button
              type="button"
              onClick={() => openModal(0)}
              className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-xl border-2 border-[#1f2937] bg-[#00b33c] px-6 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-[#009933]"
            >
              <PhotoIcon className="w-5 h-5" />
              Show all
            </button>
          </div>
        </div>
      </div>

      <CarPhotoModal
        isOpen={isModalOpen}
        title={title}
        photos={galleryPhotos.map((entry) => entry.url)}
        initialIndex={activeIndex}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
