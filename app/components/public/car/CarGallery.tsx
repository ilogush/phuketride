import { useMemo, useState } from "react";
import Button from "~/components/public/Button";
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

  const galleryPhotos = useMemo(() => {
    const cleanPhotos = photos.filter(Boolean);
    return cleanPhotos;
  }, [photos]);

  if (!galleryPhotos.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-100 aspect-[4/3] flex items-center justify-center text-gray-500">
        No photos uploaded
      </div>
    );
  }

  const mainPhoto = galleryPhotos[0];
  const secondPhoto = galleryPhotos[1] || galleryPhotos[0];
  const thirdPhoto = galleryPhotos[2] || galleryPhotos[0];

  const openModal = (index: number) => {
    setActiveIndex(index);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl overflow-hidden border border-gray-200 aspect-[4/3]">
          <button type="button" onClick={() => openModal(0)} className="block w-full h-full text-left leading-none">
            <img src={mainPhoto} alt={title} className="block w-full h-full object-cover" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 aspect-[4/3]">
            <button type="button" onClick={() => openModal(1)} className="block w-full h-full text-left leading-none">
              <img src={secondPhoto} alt={`${title} 2`} className="block w-full h-full object-cover" />
            </button>
            <Button
              type="button"
              className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-white/95 border border-gray-300 text-gray-700"
            >
              <HeartIcon className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-gray-200 aspect-[4/3]">
            <button type="button" onClick={() => openModal(2)} className="block w-full h-full text-left leading-none">
              <img src={thirdPhoto} alt={`${title} 3`} className="block w-full h-full object-cover" />
            </button>
            <Button
              type="button"
              onClick={() => openModal(0)}
              className="absolute bottom-3 right-3 rounded-xl bg-white text-gray-800 border border-gray-300 px-4 py-2 text-base font-medium gap-2"
            >
              <PhotoIcon className="w-5 h-5" />
              {`View ${galleryPhotos.length} photos`}
            </Button>
          </div>
        </div>
      </div>

      <CarPhotoModal
        isOpen={isModalOpen}
        title={title}
        photos={galleryPhotos}
        initialIndex={activeIndex}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
