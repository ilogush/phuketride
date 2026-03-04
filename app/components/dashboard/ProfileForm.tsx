import { Form } from "react-router";
import { useState, useMemo, useCallback, memo } from "react";
import FormSection from "~/components/dashboard/FormSection";
import PhotoUpload from "~/components/dashboard/PhotoUpload";
import DocumentPhotosUpload from "~/components/dashboard/DocumentPhotosUpload";
import DocumentPreview, { type DocumentPhoto } from "~/components/dashboard/DocumentPreview";
import Avatar from "~/components/dashboard/Avatar";
import ProfileHeader from "~/components/dashboard/ProfileHeader";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { getInitials, parseJSON, formatRole } from "~/lib/formatters";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { formatContactPhone } from "~/lib/phone";

// Типизации
interface Hotel {
    id: number;
    name: string;
}

interface Location {
    id: number;
    name: string;
}

interface District {
    id: number;
    name: string;
}

interface User {
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

interface ProfileFormProps {
    user: User;
    currentUserRole?: string;
    hotels: Hotel[];
    locations: Location[];
    districts?: District[];
    hotel?: Hotel | null;
    location?: Location | null;
    isEdit?: boolean;
    onPhotoChange?: (base64: string | null, fileName: string | null) => void;
}

// Мемоизированный компонент AvatarSection
const AvatarSection = memo(function AvatarSection({
    isEdit,
    avatarUrl,
    initials,
    onPhotoChange,
}: {
    isEdit: boolean;
    avatarUrl: string | null;
    initials: string;
    onPhotoChange?: (base64: string | null, fileName: string | null) => void;
}) {
    if (isEdit) {
        return (
            <PhotoUpload
                currentPhotoUrl={avatarUrl}
                onPhotoChange={onPhotoChange || (() => { })}
                initials={initials}
            />
        );
    }

    return <Avatar src={avatarUrl} initials={initials} size="lg" />;
});

function ProfileForm({
    user,
    currentUserRole,
    hotels,
    locations,
    districts = [],
    hotel,
    location,
    isEdit = false,
    onPhotoChange,
}: ProfileFormProps) {
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);
    const { validateLatinInput } = useLatinValidation();

    // Check if current user is admin
    const isAdmin = currentUserRole === "admin";

    // Use formatters from lib
    const initials = getInitials(user.name, user.surname, user.email);
    // Мемоизированный парсинг JSON для документов
    const passportPhotos = useMemo(
        () => parseJSON<DocumentPhoto[]>(user.passportPhotos),
        [user.passportPhotos]
    );

    const driverLicensePhotos = useMemo(
        () => parseJSON<DocumentPhoto[]>(user.driverLicensePhotos),
        [user.driverLicensePhotos]
    );

    const [passportUploads, setPassportUploads] = useState<DocumentPhoto[]>(passportPhotos || []);
    const [driverLicenseUploads, setDriverLicenseUploads] = useState<DocumentPhoto[]>(driverLicensePhotos || []);

    // Мемоизированные обработчики
    const handlePhotoChange = useCallback((base64: string | null, fileName: string | null) => {
        setAvatarBase64(base64);
        setAvatarFileName(fileName);
        setRemoveAvatar(!!base64 ? false : true);
        onPhotoChange?.(base64, fileName);
    }, [onPhotoChange]);

    if (isEdit) {
        return (
            <Form id="profile-form" method="post" className="space-y-4">
                <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} />
                {avatarBase64 && (
                    <>
                        <input type="hidden" name="avatarBase64" value={avatarBase64} />
                        <input type="hidden" name="avatarFileName" value={avatarFileName || ""} />
                    </>
                )}
                <input type="hidden" name="passportPhotos" value={JSON.stringify(passportUploads)} />
                <input type="hidden" name="driverLicensePhotos" value={JSON.stringify(driverLicenseUploads)} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-4">
                        <FormSection title="Profile Information" icon={<UserIcon />}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormInput
                                    isEdit
                                    label="First Name"
                                    name="name"
                                    defaultValue={user.name}
                                    placeholder="Tom"
                                    pattern="[a-zA-Z\s\-']+"
                                    onChange={(e) => validateLatinInput(e, "First Name")}
                                    required
                                />
                                <FormInput
                                    isEdit
                                    label="Last Name"
                                    name="surname"
                                    defaultValue={user.surname}
                                    placeholder="Carlson"
                                    pattern="[a-zA-Z\s\-']+"
                                    onChange={(e) => validateLatinInput(e, "Last Name")}
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
                                <FormInput
                                    isEdit
                                    label="Phone"
                                    name="phone"
                                    defaultValue={user.phone}
                                    placeholder="+66415484865"
                                    required
                                />
                                <FormInput
                                    isEdit
                                    label="WhatsApp"
                                    name="whatsapp"
                                    defaultValue={user.whatsapp}
                                    placeholder="+66415484865"
                                />
                                <FormInput
                                    isEdit
                                    label="Email"
                                    name="email"
                                    type="email"
                                    defaultValue={user.email}
                                    placeholder="ilogush@icloud.com"
                                    required
                                />
                                <FormInput
                                    isEdit
                                    label="Telegram"
                                    name="telegram"
                                    defaultValue={user.telegram}
                                    placeholder="@user_471322f2"
                                />
                                <FormInput
                                    isEdit
                                    label="Passport / ID Number"
                                    name="passportNumber"
                                    defaultValue={user.passportNumber}
                                    placeholder="758024093"
                                    required
                                />
                            </div>
                        </FormSection>

                        <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormSelect isEdit label="Hotel" name="hotelId" defaultValue={user.hotelId?.toString()} options={hotels} />
                                <FormInput isEdit label="Room Number" name="roomNumber" defaultValue={user.roomNumber} placeholder="900" />
                                <FormSelect isEdit label="Location" name="locationId" defaultValue={user.locationId?.toString()} options={locations} />
                                {districts.length > 0 && (
                                    <FormSelect
                                        isEdit
                                        label="District"
                                        name="districtId"
                                        defaultValue={user.districtId?.toString()}
                                        options={districts}
                                        placeholder="Select district"
                                    />
                                )}
                            </div>
                        </FormSection>
                    </div>

                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-3xl shadow-sm p-4">
                            <AvatarSection
                                isEdit
                                avatarUrl={user.avatarUrl}
                                initials={initials}
                                onPhotoChange={handlePhotoChange}
                            />
                        </div>

                        <FormSection title="Change Password" icon={<LockClosedIcon />}>
                            <div className="space-y-4">
                                <FormInput isEdit label="New Password" name="newPassword" type="password" placeholder="Enter new password" />
                                <FormInput isEdit label="Confirm Password" name="confirmPassword" type="password" placeholder="Confirm new password" />
                                <div className="text-xs text-gray-500">Leave empty to keep current password.</div>
                            </div>
                        </FormSection>

                        <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                            <div className="space-y-4">
                                <DocumentPhotosUpload
                                    currentPhotos={passportUploads.map((p) => p.base64)}
                                    onPhotosChange={(photos) => setPassportUploads(photos)}
                                    maxPhotos={4}
                                    label="Passport"
                                />
                                <DocumentPhotosUpload
                                    currentPhotos={driverLicenseUploads.map((p) => p.base64)}
                                    onPhotosChange={(photos) => setDriverLicenseUploads(photos)}
                                    maxPhotos={4}
                                    label="Driver License"
                                />
                            </div>
                        </FormSection>
                    </div>
                </div>
            </Form>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <AvatarSection
                    isEdit={false}
                    avatarUrl={user.avatarUrl}
                    initials={initials}
                />
                <ProfileHeader
                    name={user.name}
                    surname={user.surname}
                    email={user.email}
                    role={user.role}
                />
            </div>

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

            <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormInput isEdit={false} label="Hotel" name="hotelId" value={hotel?.name || ""} />
                    <FormInput isEdit={false} label="Room Number" name="roomNumber" value={user.roomNumber || ""} />
                    <FormInput isEdit={false} label="Area" name="locationId" value={location?.name || ""} />
                </div>
            </FormSection>

            <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                    <DocumentPreview photos={passportPhotos} label="Passport" />
                    <DocumentPreview photos={driverLicensePhotos} label="Driver License" />
                </div>
            </FormSection>
        </div>
    );
}

export default memo(ProfileForm);
