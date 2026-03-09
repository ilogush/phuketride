import { TruckIcon } from "@heroicons/react/24/outline";
import AdminCard from '~/components/shared/ui/AdminCard';
import CarPhotosUpload from "~/components/dashboard/CarPhotosUpload";

type PhotoItem = { base64: string; fileName: string };

type ContractCarPhotosCardProps = {
  currentPhotos?: string[];
  onPhotosChange: (photos: PhotoItem[]) => void;
};

export default function ContractCarPhotosCard({
  currentPhotos = [],
  onPhotosChange,
}: ContractCarPhotosCardProps) {
  return (
    <AdminCard title="Car Photos" icon={<TruckIcon className="w-5 h-5" />}>
      <CarPhotosUpload
        currentPhotos={currentPhotos}
        onPhotosChange={onPhotosChange}
        maxPhotos={12}
      />
    </AdminCard>
  );
}
