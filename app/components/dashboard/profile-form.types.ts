import type { DocumentPhoto } from "~/components/dashboard/DocumentPreview";

export interface Hotel {
  id: number;
  name: string;
}

export interface Location {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
}

export interface ProfileUser {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
  phone: string | null;
  whatsapp: string | null;
  telegram: string | null;
  passportNumber: string | null;
  hotelId: number | null;
  roomNumber: string | null;
  locationId: number | null;
  districtId: number | null;
  address: string | null;
  avatarUrl: string | null;
  role: string;
  passportPhotos: string | null;
  driverLicensePhotos: string | null;
}

export interface ProfileFormProps {
  user: ProfileUser;
  currentUserRole?: string;
  hotels: Hotel[];
  locations: Location[];
  districts?: District[];
  hotel?: Hotel | null;
  location?: Location | null;
  isEdit?: boolean;
  onPhotoChange?: (base64: string | null, fileName: string | null) => void;
}

export interface ProfileUploadState {
  avatarBase64: string | null;
  avatarFileName: string | null;
  removeAvatar: boolean;
  passportUploads: DocumentPhoto[];
  driverLicenseUploads: DocumentPhoto[];
}
