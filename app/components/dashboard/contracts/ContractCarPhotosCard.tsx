import CarPhotosUpload from "~/components/dashboard/CarPhotosUpload";

type PhotoItem = { base64: string; fileName: string };

type ContractCarPhotosCardProps = {
  currentPhotos?: string[];
  onPhotosChange: (photos: PhotoItem[]) => void;
};

export default function ContractCarPhotosCard({ currentPhotos = [], onPhotosChange }: ContractCarPhotosCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-4">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Car Photos (max 12)
      </label>
      <CarPhotosUpload
        currentPhotos={currentPhotos}
        onPhotosChange={onPhotosChange}
        maxPhotos={12}
      />
    </div>
  );
}
