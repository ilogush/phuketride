import type { ChangeEvent } from "react";
import { BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";
import DocumentPhotosUpload from "~/components/dashboard/DocumentPhotosUpload";
import DocumentPreview, { type DocumentPhoto } from "~/components/dashboard/DocumentPreview";
import FormInput from "~/components/dashboard/FormInput";
import FormSection from "~/components/dashboard/FormSection";
import FormSelect from "~/components/dashboard/FormSelect";
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
        <FormInput
          isEdit
          label="First Name"
          name="name"
          defaultValue={user.name}
          placeholder="Tom"
          pattern="[a-zA-Z\s\-']+"
          onChange={(event) => validateLatinInput(event, "First Name")}
          required
        />
        <FormInput
          isEdit
          label="Last Name"
          name="surname"
          defaultValue={user.surname}
          placeholder="Carlson"
          pattern="[a-zA-Z\s\-']+"
          onChange={(event) => validateLatinInput(event, "Last Name")}
          required
        />
        <FormSelect
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
        <FormInput isEdit label="Phone" name="phone" defaultValue={user.phone} placeholder="+66415484865" required />
        <FormInput isEdit label="WhatsApp" name="whatsapp" defaultValue={user.whatsapp} placeholder="+66415484865" />
        <FormInput isEdit label="Email" name="email" type="email" defaultValue={user.email} placeholder="ilogush@icloud.com" required />
        <FormInput isEdit label="Telegram" name="telegram" defaultValue={user.telegram} placeholder="@user_471322f2" />
        <FormInput isEdit label="Passport / ID Number" name="passportNumber" defaultValue={user.passportNumber} placeholder="758024093" required />
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
        <FormSelect isEdit label="Hotel" name="hotelId" defaultValue={user.hotelId?.toString()} options={hotels} />
        <FormInput isEdit label="Room Number" name="roomNumber" defaultValue={user.roomNumber} placeholder="900" />
        <FormSelect isEdit label="Location" name="locationId" defaultValue={user.locationId?.toString()} options={locations} />
        {districts.length > 0 ? (
          <FormSelect
            isEdit
            label="District"
            name="districtId"
            defaultValue={user.districtId?.toString()}
            options={districts}
            placeholder="Select district"
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
        <FormInput isEdit label="New Password" name="newPassword" type="password" placeholder="Enter new password" />
        <FormInput isEdit label="Confirm Password" name="confirmPassword" type="password" placeholder="Confirm new password" />
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
        <FormInput isEdit={false} label="First Name" name="name" value={user.name || ""} />
        <FormInput isEdit={false} label="Last Name" name="surname" value={user.surname || ""} />
        <FormInput isEdit={false} label="Role" name="role" value={formatRole(user.role)} />
        <FormInput isEdit={false} label="Phone" name="phone" value={formatContactPhone(user.phone)} />
        <FormInput isEdit={false} label="WhatsApp" name="whatsapp" value={formatContactPhone(user.whatsapp)} />
        <FormInput isEdit={false} label="Email" name="email" type="email" value={user.email} />
        <FormInput isEdit={false} label="Telegram" name="telegram" value={user.telegram || ""} />
        <FormInput isEdit={false} label="Passport / ID Number" name="passportNumber" value={user.passportNumber || ""} />
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
        <FormInput isEdit={false} label="Hotel" name="hotelId" value={hotel?.name || ""} />
        <FormInput isEdit={false} label="Room Number" name="roomNumber" value={roomNumber || ""} />
        <FormInput isEdit={false} label="Area" name="locationId" value={location?.name || ""} />
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
