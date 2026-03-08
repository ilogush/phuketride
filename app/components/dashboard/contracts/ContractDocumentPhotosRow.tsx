import { PhotoIcon } from "@heroicons/react/24/outline";
import AdminCard from "~/components/dashboard/AdminCard";
import DocumentPhotosUpload from "~/components/dashboard/DocumentPhotosUpload";

type PhotoItem = { base64: string; fileName: string };

type ContractDocumentPhotosRowProps = {
  passportPhotos: PhotoItem[];
  onPassportPhotosChange: (photos: PhotoItem[]) => void;
  driverLicensePhotos: PhotoItem[];
  onDriverLicensePhotosChange: (photos: PhotoItem[]) => void;
};

export default function ContractDocumentPhotosRow({
  passportPhotos,
  onPassportPhotosChange,
  driverLicensePhotos,
  onDriverLicensePhotosChange,
}: ContractDocumentPhotosRowProps) {
  return (
    <div className="space-y-4">
      <AdminCard title="Passport Photos" icon={<PhotoIcon className="w-5 h-5" />}>
        <DocumentPhotosUpload
          currentPhotos={passportPhotos.map((p) => p.base64)}
          onPhotosChange={onPassportPhotosChange}
          maxPhotos={2}
          label="Passport"
        />
      </AdminCard>

      <AdminCard title="Driver License Photos" icon={<PhotoIcon className="w-5 h-5" />}>
        <DocumentPhotosUpload
          currentPhotos={driverLicensePhotos.map((p) => p.base64)}
          onPhotosChange={onDriverLicensePhotosChange}
          maxPhotos={2}
          label="Driver License"
        />
      </AdminCard>
    </div>
  );
}
