import type { ChangeEvent } from "react";
import { BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";
import DocumentPhotosUpload from "~/components/dashboard/DocumentPhotosUpload";
import DocumentPreview, { type DocumentPhoto } from "~/components/dashboard/DocumentPreview";
import FormSection from '~/components/shared/ui/FormSection';
import { Input } from '~/components/shared/ui/Input';
import { Select } from '~/components/shared/ui/Select';
import { formatRole } from "~/lib/formatters";
import { formatContactPhone } from "~/lib/phone";
import type { District, Hotel, Location, ProfileUser } from "./profile-form.types";

interface ProfileInformationEditSectionProps {
  isAdmin: boolean;
  user: ProfileUser;
  validateLatinInput: (event: ChangeEvent<HTMLInputElement>, fieldLabel: string) => void;
}

export function ProfileInformationEditSection({
  isAdmin,
  user,
  validateLatinInput,
}: ProfileInformationEditSectionProps) {
  return (
    <FormSection title="Profile Information" icon={<UserIcon />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          isEdit
          label="First Name"
          name="name"
          defaultValue={user.name ?? undefined}
          placeholder="Tom"
          pattern="[a-zA-Z\s\-']+"
          onChange={(event) => validateLatinInput(event, "First Name")}
          required
        />
        <Input
          isEdit
          label="Last Name"
          name="surname"
          defaultValue={user.surname ?? undefined}
          placeholder="Carlson"
          pattern="[a-zA-Z\s\-']+"
          onChange={(event) => validateLatinInput(event, "Last Name")}
          required
        />
        <Select
          isEdit
          label="Role"
          name="role"
          defaultValue={user.role}
          options={[
            { id: "admin", name: "Admin" },
            { id: "partner", name: "Partner" },
            { id: "manager", name: "Manager" },
            { id: "user", name: "User" },
          ]}
          disabled={!isAdmin}
          required
        />
        <Input isEdit label="Phone" name="phone" defaultValue={user.phone ?? undefined} placeholder="+66415484865" required />
        <Input isEdit label="WhatsApp" name="whatsapp" defaultValue={user.whatsapp ?? undefined} placeholder="+66415484865" />
        <Input isEdit label="Email" name="email" type="email" defaultValue={user.email ?? undefined} placeholder="ilogush@icloud.com" required />
        <Input isEdit label="Telegram" name="telegram" defaultValue={user.telegram ?? undefined} placeholder="@user_471322f2" />
        <Input isEdit label="Passport / ID Number" name="passportNumber" defaultValue={user.passportNumber ?? undefined} placeholder="758024093" required />
      </div>
    </FormSection>
  );
}

interface AccommodationEditSectionProps {
  user: ProfileUser;
  hotels: Hotel[];
  locations: Location[];
  districts: District[];
}

export function AccommodationEditSection({
  user,
  hotels,
  locations,
  districts,
}: AccommodationEditSectionProps) {
  return (
    <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select isEdit label="Hotel" name="hotelId" defaultValue={user.hotelId?.toString()} options={hotels} />
        <Input isEdit label="Room Number" name="roomNumber" defaultValue={user.roomNumber ?? undefined} placeholder="900" />
        <Select isEdit label="Location" name="locationId" defaultValue={user.locationId?.toString()} options={locations} />
        {districts.length > 0 ? (
          <Select
            isEdit
            label="District"
            name="districtId"
            defaultValue={user.districtId?.toString()}
            options={districts}
            placeholder="Select district"
            showPlaceholderOption
          />
        ) : null}
      </div>
    </FormSection>
  );
}

interface PasswordEditSectionProps {
  show: boolean;
}

export function PasswordEditSection({ show }: PasswordEditSectionProps) {
  if (!show) {
    return null;
  }

  return (
    <FormSection title="Change Password" icon={<LockClosedIcon />}>
      <div className="space-y-4">
        <Input isEdit label="New Password" name="newPassword" type="password" placeholder="Enter new password" />
        <Input isEdit label="Confirm Password" name="confirmPassword" type="password" placeholder="Confirm new password" />
        <div className="text-xs text-gray-500">Leave empty to keep current password.</div>
      </div>
    </FormSection>
  );
}

interface DocumentsEditSectionProps {
  passportUploads: DocumentPhoto[];
  driverLicenseUploads: DocumentPhoto[];
  setPassportUploads: (photos: DocumentPhoto[]) => void;
  setDriverLicenseUploads: (photos: DocumentPhoto[]) => void;
}

export function DocumentsEditSection({
  passportUploads,
  driverLicenseUploads,
  setPassportUploads,
  setDriverLicenseUploads,
}: DocumentsEditSectionProps) {
  return (
    <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
      <div className="space-y-4">
        <DocumentPhotosUpload
          currentPhotos={passportUploads.map((photo) => photo.base64)}
          onPhotosChange={setPassportUploads}
          maxPhotos={4}
          label="Passport"
        />
        <DocumentPhotosUpload
          currentPhotos={driverLicenseUploads.map((photo) => photo.base64)}
          onPhotosChange={setDriverLicenseUploads}
          maxPhotos={4}
          label="Driver License"
        />
      </div>
    </FormSection>
  );
}

interface ProfileInformationViewSectionProps {
  user: ProfileUser;
}

export function ProfileInformationViewSection({ user }: ProfileInformationViewSectionProps) {
  return (
    <FormSection title="Profile Information" icon={<UserIcon />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input isEdit={false} label="First Name" name="name" value={user.name || ""} />
        <Input isEdit={false} label="Last Name" name="surname" value={user.surname || ""} />
        <Input isEdit={false} label="Role" name="role" value={formatRole(user.role)} />
        <Input isEdit={false} label="Phone" name="phone" value={formatContactPhone(user.phone)} />
        <Input isEdit={false} label="WhatsApp" name="whatsapp" value={formatContactPhone(user.whatsapp)} />
        <Input isEdit={false} label="Email" name="email" type="email" value={user.email} />
        <Input isEdit={false} label="Telegram" name="telegram" value={user.telegram || ""} />
        <Input isEdit={false} label="Passport / ID Number" name="passportNumber" value={user.passportNumber || ""} />
      </div>
    </FormSection>
  );
}

interface AccommodationViewSectionProps {
  hotel?: Hotel | null;
  location?: Location | null;
  roomNumber?: string | null;
}

export function AccommodationViewSection({
  hotel,
  location,
  roomNumber,
}: AccommodationViewSectionProps) {
  return (
    <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input isEdit={false} label="Hotel" name="hotelId" value={hotel?.name || ""} />
        <Input isEdit={false} label="Room Number" name="roomNumber" value={roomNumber || ""} />
        <Input isEdit={false} label="Area" name="locationId" value={location?.name || ""} />
      </div>
    </FormSection>
  );
}

interface DocumentsViewSectionProps {
  passportPhotos: DocumentPhoto[] | null;
  driverLicensePhotos: DocumentPhoto[] | null;
}

export function DocumentsViewSection({
  passportPhotos,
  driverLicensePhotos,
}: DocumentsViewSectionProps) {
  return (
    <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
        <DocumentPreview photos={passportPhotos} label="Passport" />
        <DocumentPreview photos={driverLicensePhotos} label="Driver License" />
      </div>
    </FormSection>
  );
}
