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
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
      <DocumentPhotosUpload
        currentPhotos={passportPhotos.map((p) => p.base64)}
        onPhotosChange={onPassportPhotosChange}
        maxPhotos={3}
        label="Passport"
      />
      <DocumentPhotosUpload
        currentPhotos={driverLicensePhotos.map((p) => p.base64)}
        onPhotosChange={onDriverLicensePhotosChange}
        maxPhotos={3}
        label="Driver License"
      />
    </div>
  );
}
