import { Form } from "react-router";
import { useState, useMemo, useCallback, memo } from "react";
import { Input } from "~/components/ui/Input";
import FormSection from "~/components/ui/FormSection";
import PhotoUpload from "~/components/ui/PhotoUpload";
import DocumentPhotosUpload from "~/components/ui/DocumentPhotosUpload";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { selectBaseStyles } from "~/lib/styles/input";

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
    districts: District[];
    country?: Country | null;
    hotel?: Hotel | null;
    location?: Location | null;
    district?: District | null;
    isEdit?: boolean;
    onPhotoChange?: (base64: string | null, fileName: string | null) => void;
    onRemoveAvatar?: () => void;
}

// Типы для фото документов
interface DocumentPhoto {
    base64: string;
    fileName: string;
}

// Константы для CSS классов - disabled поля с серым-200 фоном
const DISABLED_SELECT_CLASS = "block w-full h-10 rounded-xl text-sm py-2.5 px-4 bg-gray-200 text-gray-800 border border-gray-200 cursor-not-allowed";

// Мемоизированный компонент AvatarSection
const AvatarSection = memo(function AvatarSection({
    isEdit,
    avatarUrl,
    initials,
    onPhotoChange,
    onRemoveAvatar,
    avatarBase64,
    avatarFileName,
    removeAvatar,
}: {
    isEdit: boolean;
    avatarUrl: string | null;
    initials: string;
    onPhotoChange?: ((base64: string | null, fileName: string | null) => void) | undefined;
    onRemoveAvatar?: () => void;
    avatarBase64: string | null;
    avatarFileName: string | null;
    removeAvatar: boolean;
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

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
        );
    }

    return (
        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
        </div>
    );
});

// Мемоизированный компонент DocumentPhotosDisplay
const DocumentPhotosDisplay = memo(function DocumentPhotosDisplay({
    photos,
    label,
}: {
    photos: DocumentPhoto[] | null;
    label: string;
}) {
    if (!photos || photos.length === 0) {
        return (
            <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">{label}</h4>
                <span className="text-xs text-gray-400">No photos uploaded</span>
            </div>
        );
    }

    return (
        <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">{label}</h4>
            <div className="flex items-center gap-2">
                {photos.map((photo, index) => (
                    <div
                        key={index}
                        className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50"
                    >
                        <img
                            src={photo.base64}
                            alt={photo.fileName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}
                <span className="text-xs text-gray-400 ml-1">
                    ({photos.length}/2)
                </span>
            </div>
        </div>
    );
});

// Мемоизированный компонент поля ввода
const ProfileField = memo(function ProfileField({
    label,
    name,
    type = "text",
    value,
    defaultValue,
    placeholder,
    required = false,
    disabled = false,
    selectOptions = null,
    isEdit,
}: {
    label: string;
    name: string;
    type?: string;
    value?: string | number | null;
    defaultValue?: string | number | null;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    selectOptions?: Array<{ id: number | string; name: string }> | null;
    isEdit?: boolean;
}) {
    const isFieldDisabled = disabled || (isEdit === false);

    // Use value for controlled (disabled) fields, defaultValue for editable fields
    const selectValue = isFieldDisabled ? (value ?? defaultValue ?? "") : undefined;
    const selectDefaultValue = !isFieldDisabled ? (defaultValue ?? value ?? "") : undefined;

    const inputValue = isFieldDisabled ? (value ?? defaultValue ?? "") : undefined;
    const inputDefaultValue = !isFieldDisabled ? (defaultValue ?? value ?? "") : undefined;

    const content = selectOptions ? (
        <div className="mt-2">
            <label className="block text-xs text-gray-600 mb-1">{label}</label>
            <select
                name={name}
                defaultValue={selectDefaultValue}
                value={selectValue}
                disabled={isFieldDisabled}
                className={isFieldDisabled ? DISABLED_SELECT_CLASS : selectBaseStyles}
                required={required}
            >
                <option value="">Select {label}</option>
                {selectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </div>
    ) : (
        <Input
            label={label}
            name={name}
            type={type}
            value={inputValue}
            defaultValue={inputDefaultValue}
            placeholder={placeholder}
            required={required}
            disabled={isFieldDisabled}
        />
    );

    return <>{content}</>;
});

// Мемоизированный компонент ReadOnlyField
const ReadOnlyField = memo(function ReadOnlyField({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="mt-2">
            <label className="block text-xs text-gray-600 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                disabled
                className={DISABLED_SELECT_CLASS}
            />
        </div>
    );
});

function ProfileForm({
    user,
    currentUserRole,
    countries,
    hotels,
    locations,
    districts,
    country,
    hotel,
    location,
    district,
    isEdit = false,
    onPhotoChange,
    onRemoveAvatar,
}: ProfileFormProps) {
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);

    // Check if current user is admin
    const isAdmin = currentUserRole === "admin";

    // Мемоизированные вычисления
    const initials = useMemo(() => {
        return `${user.name?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase()
            || (user.email?.[0]?.toUpperCase() || '?');
    }, [user.name, user.surname, user.email]);

    // Мемоизированный парсинг JSON для документов
    const passportPhotos = useMemo(() => {
        if (!user.passportPhotos) return null;
        try {
            return JSON.parse(user.passportPhotos) as DocumentPhoto[];
        } catch {
            console.error('Failed to parse passport photos');
            return null;
        }
    }, [user.passportPhotos]);

    const driverLicensePhotos = useMemo(() => {
        if (!user.driverLicensePhotos) return null;
        try {
            return JSON.parse(user.driverLicensePhotos) as DocumentPhoto[];
        } catch {
            console.error('Failed to parse driver license photos');
            return null;
        }
    }, [user.driverLicensePhotos]);

    // Форматированная дата рождения
    const formattedDateOfBirth = useMemo(() => {
        if (!user.dateOfBirth) return "";
        return new Date(user.dateOfBirth).toISOString().split('T')[0];
    }, [user.dateOfBirth]);

    // Форматированная роль
    const formattedRole = useMemo(() => {
        return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    }, [user.role]);

    // Мемоизированные обработчики
    const handlePhotoChange = useCallback((base64: string | null, fileName: string | null) => {
        setAvatarBase64(base64);
        setAvatarFileName(fileName);
        setRemoveAvatar(!!base64 ? false : true);
        onPhotoChange?.(base64, fileName);
    }, [onPhotoChange]);

    const handleRemoveAvatar = useCallback(() => {
        setRemoveAvatar(true);
        setAvatarBase64(null);
        setAvatarFileName(null);
        onRemoveAvatar?.();
    }, [onRemoveAvatar]);

    // Секции формы
    const formContent = (
        <div className="space-y-4">
            {/* Profile Information Section */}
            <FormSection title="Profile Information" icon={<UserIcon />}>
                <div className="grid grid-cols-4 gap-4">
                    <ProfileField isEdit={isEdit}
                        label="First Name"
                        name="name"
                        defaultValue={user.name}
                        placeholder="Tom"
                        required
                    />
                    <ProfileField isEdit={isEdit}
                        label="Last Name"
                        name="surname"
                        defaultValue={user.surname}
                        placeholder="Carlson"
                        required
                    />
                    <div className="mt-2">
                        <label className="block text-xs text-gray-600 mb-1">Gender</label>
                        <select
                            name="gender"
                            defaultValue={user.gender || ""}
                            disabled={!isEdit}
                            className={!isEdit ? DISABLED_SELECT_CLASS : selectBaseStyles}
                        >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <ProfileField isEdit={isEdit}
                        label="Date of Birth"
                        name="dateOfBirth"
                        type="date"
                        defaultValue={formattedDateOfBirth}
                    />
                </div>

                <div className="grid grid-cols-4 gap-4 mt-2">
                    <div className="mt-2">
                        <label className="block text-xs text-gray-600 mb-1">Role</label>
                        <select
                            name="role"
                            defaultValue={user.role}
                            disabled={!isEdit || !isAdmin}
                            className={(!isEdit || !isAdmin) ? DISABLED_SELECT_CLASS : selectBaseStyles}
                        >
                            <option value="admin">Admin</option>
                            <option value="partner">Partner</option>
                            <option value="manager">Manager</option>
                            <option value="user">User</option>
                        </select>
                    </div>
                    <ProfileField isEdit={isEdit}
                        label="Phone"
                        name="phone"
                        defaultValue={user.phone}
                        placeholder="+66415484865"
                    />
                    <ProfileField isEdit={isEdit}
                        label="WhatsApp"
                        name="whatsapp"
                        defaultValue={user.whatsapp}
                        placeholder="+66 83 881 7057"
                    />
                    <ProfileField isEdit={isEdit}
                        label="Email"
                        name="email"
                        type="email"
                        defaultValue={user.email}
                        placeholder="ilogush@icloud.com"
                    />
                </div>

                <div className="grid grid-cols-4 gap-4 mt-2">
                    <ProfileField isEdit={isEdit}
                        label="Telegram"
                        name="telegram"
                        defaultValue={user.telegram}
                        placeholder="@user_471322f2"
                    />
                    <ProfileField isEdit={isEdit}
                        label="Country"
                        name="countryId"
                        defaultValue={user.countryId?.toString()}
                        selectOptions={countries}
                    />
                    <ProfileField isEdit={isEdit}
                        label="City"
                        name="city"
                        defaultValue={user.city}
                        placeholder="Moscow"
                    />
                    <ProfileField isEdit={isEdit}
                        label="Passport / ID Number"
                        name="passportNumber"
                        defaultValue={user.passportNumber}
                        placeholder="758024093"
                    />
                </div>
            </FormSection>

            {/* Accommodation Section */}
            <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                <div className="grid grid-cols-4 gap-4 mt-2">
                    <ProfileField isEdit={isEdit}
                        label="Location"
                        name="accommodationLocation"
                        defaultValue="Phuket"
                        placeholder="Phuket"
                    />
                    <ProfileField isEdit={isEdit}
                        label="Hotel"
                        name="hotelId"
                        defaultValue={user.hotelId?.toString()}
                        selectOptions={hotels}
                    />
                    <ProfileField isEdit={isEdit}
                        label="Room Number"
                        name="roomNumber"
                        defaultValue={user.roomNumber}
                        placeholder="900"
                    />
                    <ProfileField isEdit={isEdit}
                        label="Location"
                        name="locationId"
                        defaultValue={user.locationId?.toString()}
                        selectOptions={locations}
                    />
                </div>
            </FormSection>

            {/* Document Photos Section */}
            <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                {isEdit ? (
                    <DocumentPhotosUpload
                        onPassportPhotosChange={(photos) => {
                            console.log('Passport photos:', photos);
                        }}
                        onDriverLicensePhotosChange={(photos) => {
                            console.log('Driver license photos:', photos);
                        }}
                    />
                ) : (
                    <div className="flex gap-8">
                        <DocumentPhotosDisplay
                            photos={passportPhotos}
                            label="Passport Photos"
                        />
                        <DocumentPhotosDisplay
                            photos={driverLicensePhotos}
                            label="Driver License Photos"
                        />
                    </div>
                )}
            </FormSection>

            {/* Change Password Section */}
            {isEdit && (
                <FormSection title="Change Password" icon={<LockClosedIcon />}>
                    <div className="grid grid-cols-4 gap-4">
                        <ProfileField isEdit={isEdit}
                            label="New Password"
                            name="newPassword"
                            type="password"
                            placeholder="Enter new password"
                        />
                        <ProfileField isEdit={isEdit}
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
                    onRemoveAvatar={handleRemoveAvatar}
                    avatarBase64={avatarBase64}
                    avatarFileName={avatarFileName}
                    removeAvatar={removeAvatar}
                />
                <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-gray-900">
                        {user.name && user.surname ? `${user.name} ${user.surname}` : user.email}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </p>
                </div>
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
                <div className="space-y-4">
                    {/* Profile Information Read Only */}
                    <FormSection title="Profile Information" icon={<UserIcon />}>
                        <div className="grid grid-cols-4 gap-4 mt-2">
                            <ProfileField isEdit={isEdit}
                                label="First Name"
                                name="name"
                                value={user.name || ""}
                            />
                            <ProfileField isEdit={isEdit}
                                label="Last Name"
                                name="surname"
                                value={user.surname || ""}
                            />
                            <div className="mt-2">
                                <label className="block text-xs text-gray-600 mb-1">Gender</label>
                                <select
                                    value={user.gender || ""}
                                    disabled
                                    className={DISABLED_SELECT_CLASS}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <ProfileField isEdit={isEdit}
                                label="Date of Birth"
                                name="dateOfBirth"
                                type="date"
                                value={formattedDateOfBirth}
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-2">
                            <ReadOnlyField
                                label="Role"
                                value={formattedRole}
                            />
                            <ProfileField isEdit={isEdit}
                                label="Phone"
                                name="phone"
                                value={user.phone || ""}
                            />
                            <ProfileField isEdit={isEdit}
                                label="WhatsApp"
                                name="whatsapp"
                                value={user.whatsapp || ""}
                            />
                            <ProfileField isEdit={isEdit}
                                label="Email"
                                name="email"
                                type="email"
                                value={user.email}
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-2">
                            <ProfileField isEdit={isEdit}
                                label="Telegram"
                                name="telegram"
                                value={user.telegram || ""}
                            />
                            <ReadOnlyField
                                label="Country"
                                value={country?.name || ""}
                            />
                            <ProfileField isEdit={isEdit}
                                label="City"
                                name="city"
                                value={user.city || ""}
                            />
                            <ProfileField isEdit={isEdit}
                                label="Passport / ID Number"
                                name="passportNumber"
                                value={user.passportNumber || ""}
                            />
                        </div>
                    </FormSection>

                    {/* Accommodation Read Only */}
                    <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                        <div className="grid grid-cols-4 gap-4 mt-2">
                            <ReadOnlyField
                                label="Location"
                                value="Phuket"
                            />
                            <ReadOnlyField
                                label="Hotel"
                                value={hotel?.name || ""}
                            />
                            <ProfileField isEdit={isEdit}
                                label="Room Number"
                                name="roomNumber"
                                value={user.roomNumber || ""}
                            />
                            <ReadOnlyField
                                label="Area"
                                value={location?.name || ""}
                            />
                        </div>
                    </FormSection>

                    {/* Document Photos Read Only */}
                    <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                        <div className="flex gap-8">
                            <DocumentPhotosDisplay
                                photos={passportPhotos}
                                label="Passport Photos"
                            />
                            <DocumentPhotosDisplay
                                photos={driverLicensePhotos}
                                label="Driver License Photos"
                            />
                        </div>
                    </FormSection>
                </div>
            )}
        </div>
    );
}

export default memo(ProfileForm);
