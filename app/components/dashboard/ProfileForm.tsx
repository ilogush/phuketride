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
import { getInitials, formatDateForInput, parseJSON, formatRole } from "~/lib/formatters";

// Типизации
interface Country {
    id: number;
    name: string;
}

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
    citizenship: string | null;
    city: string | null;
    countryId: number | null;
    dateOfBirth: Date | null;
    gender: "male" | "female" | "other" | null;
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
    countries: Country[];
    hotels: Hotel[];
    locations: Location[];
    country?: Country | null;
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
    countries,
    hotels,
    locations,
    country,
    hotel,
    location,
    isEdit = false,
    onPhotoChange,
}: ProfileFormProps) {
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);

    // Check if current user is admin
    const isAdmin = currentUserRole === "admin";

    // Use formatters from lib
    const initials = getInitials(user.name, user.surname, user.email);
    const formattedDateOfBirth = formatDateForInput(user.dateOfBirth);

    // Мемоизированный парсинг JSON для документов
    const passportPhotos = useMemo(
        () => parseJSON<DocumentPhoto[]>(user.passportPhotos),
        [user.passportPhotos]
    );

    const driverLicensePhotos = useMemo(
        () => parseJSON<DocumentPhoto[]>(user.driverLicensePhotos),
        [user.driverLicensePhotos]
    );

    // Мемоизированные обработчики
    const handlePhotoChange = useCallback((base64: string | null, fileName: string | null) => {
        setAvatarBase64(base64);
        setAvatarFileName(fileName);
        setRemoveAvatar(!!base64 ? false : true);
        onPhotoChange?.(base64, fileName);
    }, [onPhotoChange]);

    // Универсальная форма для обоих режимов
    const formContent = (
        <div className="space-y-4">
            {/* Profile Information Section */}
            <FormSection title="Profile Information" icon={<UserIcon />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormInput
                        isEdit={isEdit}
                        label="First Name"
                        name="name"
                        value={isEdit ? undefined : (user.name || "")}
                        defaultValue={isEdit ? user.name : undefined}
                        placeholder="Tom"
                        required
                    />
                    <FormInput
                        isEdit={isEdit}
                        label="Last Name"
                        name="surname"
                        value={isEdit ? undefined : (user.surname || "")}
                        defaultValue={isEdit ? user.surname : undefined}
                        placeholder="Carlson"
                        required
                    />
                    <FormSelect
                        isEdit={isEdit}
                        label="Gender"
                        name="gender"
                        value={isEdit ? undefined : (user.gender || "")}
                        defaultValue={isEdit ? (user.gender || "") : undefined}
                        options={[
                            { id: "male", name: "Male" },
                            { id: "female", name: "Female" },
                            { id: "other", name: "Other" }
                        ]}
                        placeholder="Select Gender"
                    />
                    <FormInput
                        isEdit={isEdit}
                        label="Date of Birth"
                        name="dateOfBirth"
                        type="date"
                        value={isEdit ? undefined : formattedDateOfBirth}
                        defaultValue={isEdit ? formattedDateOfBirth : undefined}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isEdit ? (
                        <FormSelect
                            isEdit={isEdit}
                            label="Role"
                            name="role"
                            defaultValue={user.role}
                            options={[
                                { id: "admin", name: "Admin" },
                                { id: "partner", name: "Partner" },
                                { id: "manager", name: "Manager" },
                                { id: "user", name: "User" }
                            ]}
                            disabled={!isAdmin}
                        />
                    ) : (
                        <FormInput
                            isEdit={false}
                            label="Role"
                            name="role"
                            value={formatRole(user.role)}
                        />
                    )}
                    <FormInput
                        isEdit={isEdit}
                        label="Phone"
                        name="phone"
                        value={isEdit ? undefined : (user.phone || "")}
                        defaultValue={isEdit ? user.phone : undefined}
                        placeholder="+66415484865"
                    />
                    <FormInput
                        isEdit={isEdit}
                        label="WhatsApp"
                        name="whatsapp"
                        value={isEdit ? undefined : (user.whatsapp || "")}
                        defaultValue={isEdit ? user.whatsapp : undefined}
                        placeholder="+66 83 881 7057"
                    />
                    <FormInput
                        isEdit={isEdit}
                        label="Email"
                        name="email"
                        type="email"
                        value={isEdit ? undefined : user.email}
                        defaultValue={isEdit ? user.email : undefined}
                        placeholder="ilogush@icloud.com"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormInput
                        isEdit={isEdit}
                        label="Telegram"
                        name="telegram"
                        value={isEdit ? undefined : (user.telegram || "")}
                        defaultValue={isEdit ? user.telegram : undefined}
                        placeholder="@user_471322f2"
                    />
                    {isEdit ? (
                        <FormSelect
                            isEdit={isEdit}
                            label="Country"
                            name="countryId"
                            defaultValue={user.countryId?.toString()}
                            options={countries}
                        />
                    ) : (
                        <FormInput
                            isEdit={false}
                            label="Country"
                            name="countryId"
                            value={country?.name || ""}
                        />
                    )}
                    <FormInput
                        isEdit={isEdit}
                        label="City"
                        name="city"
                        value={isEdit ? undefined : (user.city || "")}
                        defaultValue={isEdit ? user.city : undefined}
                        placeholder="Moscow"
                    />
                    <FormInput
                        isEdit={isEdit}
                        label="Passport / ID Number"
                        name="passportNumber"
                        value={isEdit ? undefined : (user.passportNumber || "")}
                        defaultValue={isEdit ? user.passportNumber : undefined}
                        placeholder="758024093"
                    />
                </div>
            </FormSection>

            {/* Accommodation Section */}
            <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {isEdit ? (
                        <FormInput
                            isEdit={isEdit}
                            label="Location"
                            name="accommodationLocation"
                            defaultValue="Phuket"
                            placeholder="Phuket"
                        />
                    ) : (
                        <FormInput
                            isEdit={false}
                            label="Location"
                            name="accommodationLocation"
                            value="Phuket"
                        />
                    )}
                    {isEdit ? (
                        <FormSelect
                            isEdit={isEdit}
                            label="Hotel"
                            name="hotelId"
                            defaultValue={user.hotelId?.toString()}
                            options={hotels}
                        />
                    ) : (
                        <FormInput
                            isEdit={false}
                            label="Hotel"
                            name="hotelId"
                            value={hotel?.name || ""}
                        />
                    )}
                    <FormInput
                        isEdit={isEdit}
                        label="Room Number"
                        name="roomNumber"
                        value={isEdit ? undefined : (user.roomNumber || "")}
                        defaultValue={isEdit ? user.roomNumber : undefined}
                        placeholder="900"
                    />
                    {isEdit ? (
                        <FormSelect
                            isEdit={isEdit}
                            label="Location"
                            name="locationId"
                            defaultValue={user.locationId?.toString()}
                            options={locations}
                        />
                    ) : (
                        <FormInput
                            isEdit={false}
                            label="Area"
                            name="locationId"
                            value={location?.name || ""}
                        />
                    )}
                </div>
            </FormSection>

            {/* Document Photos Section */}
            <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                {isEdit ? (
                    <DocumentPhotosUpload
                        onPassportPhotosChange={() => {}}
                        onDriverLicensePhotosChange={() => {}}
                    />
                ) : (
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                        <DocumentPreview photos={passportPhotos} label="Passport" />
                        <DocumentPreview photos={driverLicensePhotos} label="Driver License" />
                    </div>
                )}
            </FormSection>

            {/* Change Password Section */}
            {isEdit && (
                <FormSection title="Change Password" icon={<LockClosedIcon />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInput
                            isEdit={isEdit}
                            label="New Password"
                            name="newPassword"
                            type="password"
                            placeholder="Enter new password"
                        />
                        <FormInput
                            isEdit={isEdit}
                            label="Confirm Password"
                            name="confirmPassword"
                            type="password"
                            placeholder="Confirm new password"
                        />
                        <div />
                        <div />
                    </div>
                </FormSection>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Profile Photo Section */}
            <div className="flex items-center gap-4">
                <AvatarSection
                    isEdit={isEdit}
                    avatarUrl={user.avatarUrl}
                    initials={initials}
                    onPhotoChange={handlePhotoChange}
                />
                <ProfileHeader
                    name={user.name}
                    surname={user.surname}
                    email={user.email}
                    role={user.role}
                />
            </div>

            {isEdit ? (
                <Form id="profile-form" method="post" className="space-y-4">
                    <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} />
                    {avatarBase64 && (
                        <>
                            <input type="hidden" name="avatarBase64" value={avatarBase64} />
                            <input type="hidden" name="avatarFileName" value={avatarFileName || ""} />
                        </>
                    )}
                    <input type="hidden" name="passportPhotos" value={user.passportPhotos || ""} />
                    <input type="hidden" name="driverLicensePhotos" value={user.driverLicensePhotos || ""} />
                    {formContent}
                </Form>
            ) : (
                formContent
            )}
        </div>
    );
}

export default memo(ProfileForm);
