import { Form } from "react-router";
import { useState } from "react";
import { Input } from "~/components/ui/Input";
import FormSection from "~/components/ui/FormSection";
import PhotoUpload from "~/components/ui/PhotoUpload";
import DocumentPhotosUpload from "~/components/ui/DocumentPhotosUpload";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon } from "@heroicons/react/24/outline";

interface ProfileFormProps {
    user: {
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
    };
    countries: Array<{ id: number; name: string }>;
    hotels: Array<{ id: number; name: string }>;
    locations: Array<{ id: number; name: string }>;
    districts: Array<{ id: number; name: string }>;
    country?: { id: number; name: string } | null;
    hotel?: { id: number; name: string } | null;
    location?: { id: number; name: string } | null;
    district?: { id: number; name: string } | null;
    isEdit?: boolean;
    onPhotoChange?: (base64: string | null, fileName: string | null) => void;
    onRemoveAvatar?: () => void;
}

export default function ProfileForm({
    user,
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

    const initials = `${user.name?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase() || (user.email?.[0]?.toUpperCase() || '?');

    const handlePhotoChange = (base64: string | null, fileName: string | null) => {
        setAvatarBase64(base64);
        setAvatarFileName(fileName);
        if (base64) {
            setRemoveAvatar(false);
        } else {
            setRemoveAvatar(true);
        }
        onPhotoChange?.(base64, fileName);
    };

    const handleRemoveAvatar = () => {
        setRemoveAvatar(true);
        setAvatarBase64(null);
        setAvatarFileName(null);
        onRemoveAvatar?.();
    };

    const commonInputClass = isEdit
        ? "w-full px-4 py-2.5 bg-white rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
        : "w-full px-4 py-2.5 bg-gray-100 rounded-xl sm:text-sm text-gray-500 cursor-not-allowed";

    const commonSelectClass = isEdit
        ? "w-full px-4 py-2.5 bg-white rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300 transition-all"
        : "w-full px-4 py-2.5 bg-gray-100 rounded-xl sm:text-sm text-gray-500 cursor-not-allowed";

    return (
        <div className="space-y-4">
            {/* Profile Photo Section */}
            <div className="bg-white rounded-3xl shadow-sm p-4">
                <div className="flex items-center gap-4">
                    {isEdit ? (
                        <PhotoUpload
                            currentPhotoUrl={user.avatarUrl}
                            onPhotoChange={handlePhotoChange}
                            initials={initials}
                        />
                    ) : user.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt="Profile"
                            className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                            {initials}
                        </div>
                    )}
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

                    <FormSection title="Profile Information" icon={<UserIcon />}>
                        <div className="grid grid-cols-4 gap-4">
                            <Input
                                label="First Name"
                                name="name"
                                defaultValue={user.name || ""}
                                placeholder="Tom"
                                required
                            />
                            <Input
                                label="Last Name"
                                name="surname"
                                defaultValue={user.surname || ""}
                                placeholder="Carlson"
                                required
                            />
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Gender</label>
                                <select
                                    name="gender"
                                    defaultValue={user.gender || ""}
                                    className={commonSelectClass}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <Input
                                label="Date of Birth"
                                name="dateOfBirth"
                                type="date"
                                defaultValue={user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ""}
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-2">
                            <Input
                                label="Role"
                                name="role"
                                defaultValue={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            />
                            <Input
                                label="Phone"
                                name="phone"
                                defaultValue={user.phone || ""}
                                placeholder="+66415484865"
                            />
                            <Input
                                label="WhatsApp"
                                name="whatsapp"
                                defaultValue={user.whatsapp || ""}
                                placeholder="+66 83 881 7057"
                            />
                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                defaultValue={user.email}
                                placeholder="ilogush@icloud.com"
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-2">
                            <Input
                                label="Telegram"
                                name="telegram"
                                defaultValue={user.telegram || ""}
                                placeholder="@user_471322f2"
                            />
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Country</label>
                                <select
                                    name="countryId"
                                    defaultValue={user.countryId || ""}
                                    className={commonSelectClass}
                                >
                                    <option value="">Select Country</option>
                                    {countries.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Input
                                label="City"
                                name="city"
                                defaultValue={user.city || ""}
                                placeholder="Moscow"
                            />
                            <Input
                                label="Passport / ID Number"
                                name="passportNumber"
                                defaultValue={user.passportNumber || ""}
                                placeholder="758024093"
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                        <div className="grid grid-cols-4 gap-4 mb-2">
                            <Input
                                label="Location"
                                name="accommodationLocation"
                                defaultValue="Phuket"
                                placeholder="Phuket"
                            />
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Hotel</label>
                                <select
                                    name="hotelId"
                                    defaultValue={user.hotelId || ""}
                                    className={commonSelectClass}
                                >
                                    <option value="">Select Hotel</option>
                                    {hotels.map((h) => (
                                        <option key={h.id} value={h.id}>
                                            {h.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Input
                                label="Room Number"
                                name="roomNumber"
                                defaultValue={user.roomNumber || ""}
                                placeholder="900"
                            />
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Location</label>
                                <select
                                    name="locationId"
                                    defaultValue={user.locationId || ""}
                                    className={commonSelectClass}
                                >
                                    <option value="">Select Location</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                        <DocumentPhotosUpload
                            onPassportPhotosChange={(photos) => {
                                console.log('Passport photos:', photos);
                            }}
                            onDriverLicensePhotosChange={(photos) => {
                                console.log('Driver license photos:', photos);
                            }}
                        />
                    </FormSection>

                    <FormSection title="Change Password" icon={<LockClosedIcon />}>
                        <div className="grid grid-cols-4 gap-4">
                            <Input
                                label="New Password"
                                name="newPassword"
                                type="password"
                                placeholder="Enter new password"
                            />
                            <Input
                                label="Confirm Password"
                                name="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                            />
                            <div />
                            <div />
                        </div>
                    </FormSection>
                </Form>
            ) : (
                <div className="space-y-4">
                    <FormSection title="Profile Information" icon={<UserIcon />}>
                        <div className="grid grid-cols-4 gap-4 mb-2">
                            <Input
                                label="First Name"
                                name="name"
                                value={user.name || ""}
                                disabled
                            />
                            <Input
                                label="Last Name"
                                name="surname"
                                value={user.surname || ""}
                                disabled
                            />
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Gender</label>
                                <select
                                    value={user.gender || ""}
                                    disabled
                                    className={commonSelectClass}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <Input
                                label="Date of Birth"
                                name="dateOfBirth"
                                type="date"
                                value={user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ""}
                                disabled
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-2">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Role</label>
                                <input
                                    type="text"
                                    value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                    disabled
                                    className={commonInputClass}
                                />
                            </div>
                            <Input
                                label="Phone"
                                name="phone"
                                value={user.phone || ""}
                                disabled
                            />
                            <Input
                                label="WhatsApp"
                                name="whatsapp"
                                value={user.whatsapp || ""}
                                disabled
                            />
                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                value={user.email}
                                disabled
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-2">
                            <Input
                                label="Telegram"
                                name="telegram"
                                value={user.telegram || ""}
                                disabled
                            />
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Country</label>
                                <input
                                    type="text"
                                    value={country?.name || ""}
                                    disabled
                                    className={commonInputClass}
                                />
                            </div>
                            <Input
                                label="City"
                                name="city"
                                value={user.city || ""}
                                disabled
                            />
                            <Input
                                label="Passport / ID Number"
                                name="passportNumber"
                                value={user.passportNumber || ""}
                                disabled
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Accommodation" icon={<BuildingOfficeIcon />}>
                        <div className="grid grid-cols-4 gap-4 mb-2">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Location</label>
                                <input
                                    type="text"
                                    value="Phuket"
                                    disabled
                                    className={commonInputClass}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Hotel</label>
                                <input
                                    type="text"
                                    value={hotel?.name || ""}
                                    disabled
                                    className={commonInputClass}
                                />
                            </div>
                            <Input
                                label="Room Number"
                                name="roomNumber"
                                value={user.roomNumber || ""}
                                disabled
                            />
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Area</label>
                                <input
                                    type="text"
                                    value={location?.name || ""}
                                    disabled
                                    className={commonInputClass}
                                />
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Document Photos" icon={<DocumentTextIcon />}>
                        <div className="flex">
                            {/* Passport Photos - left aligned */}
                            <div className="w-1/3">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Passport Photos</h4>
                                <div className="flex items-center gap-2">
                                    {user.passportPhotos && JSON.parse(user.passportPhotos).map((photo: { base64: string; fileName: string }, index: number) => (
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
                                    {!user.passportPhotos && (
                                        <span className="text-xs text-gray-400">No photos uploaded</span>
                                    )}
                                    {user.passportPhotos && (
                                        <span className="text-xs text-gray-400 ml-1">
                                            ({JSON.parse(user.passportPhotos).length}/2)
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Driver License Photos - center */}
                            <div className="w-1/3 flex justify-center">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Driver License Photos</h4>
                                    <div className="flex items-center gap-2">
                                        {user.driverLicensePhotos && JSON.parse(user.driverLicensePhotos).map((photo: { base64: string; fileName: string }, index: number) => (
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
                                        {!user.driverLicensePhotos && (
                                            <span className="text-xs text-gray-400">No photos uploaded</span>
                                        )}
                                        {user.driverLicensePhotos && (
                                            <span className="text-xs text-gray-400 ml-1">
                                                ({JSON.parse(user.driverLicensePhotos).length}/2)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Empty space for balance */}
                            <div className="w-1/3"></div>
                        </div>
                    </FormSection>

                    <FormSection title="Change Password" icon={<LockClosedIcon />}>
                        <div className="grid grid-cols-4 gap-4">
                            <Input
                                label="New Password"
                                name="newPassword"
                                type="password"
                                value="********"
                                disabled
                            />
                            <Input
                                label="Confirm Password"
                                name="confirmPassword"
                                type="password"
                                value="********"
                                disabled
                            />
                            <div />
                            <div />
                        </div>
                    </FormSection>
                </div>
            )}
        </div>
    );
}
