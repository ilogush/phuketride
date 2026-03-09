import { Form } from "react-router";
import PhotoUpload from "~/components/dashboard/PhotoUpload";
import Avatar from '~/components/shared/ui/Avatar';
import ProfileHeader from "~/components/dashboard/ProfileHeader";
import { memo } from "react";
import {
    AccommodationEditSection,
    AccommodationViewSection,
    DocumentsEditSection,
    DocumentsViewSection,
    PasswordEditSection,
    ProfileInformationEditSection,
    ProfileInformationViewSection,
} from "./ProfileFormSections";
import type { ProfileFormProps } from "./profile-form.types";
import { useProfileFormState } from '~/hooks/useProfileFormState';

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
                label="User Avatar"
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
    const isAdmin = currentUserRole === "admin";
    const {
        avatarBase64,
        avatarFileName,
        driverLicensePhotos,
        driverLicenseUploads,
        handlePhotoChange,
        initials,
        passportPhotos,
        passportUploads,
        removeAvatar,
        setDriverLicenseUploads,
        setPassportUploads,
        validateLatinInput,
    } = useProfileFormState({ user, onPhotoChange });

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
                        <ProfileInformationEditSection isAdmin={isAdmin} user={user} validateLatinInput={validateLatinInput} />
                        <AccommodationEditSection user={user} hotels={hotels} locations={locations} districts={districts} />
                    </div>

                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-3xl p-4 ring-1 ring-black/5">
                            <AvatarSection
                                isEdit
                                avatarUrl={user.avatarUrl}
                                initials={initials}
                                onPhotoChange={handlePhotoChange}
                            />
                        </div>
                        <PasswordEditSection show />
                        <DocumentsEditSection
                            passportUploads={passportUploads}
                            driverLicenseUploads={driverLicenseUploads}
                            setPassportUploads={setPassportUploads}
                            setDriverLicenseUploads={setDriverLicenseUploads}
                        />
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

            <ProfileInformationViewSection user={user} />
            <AccommodationViewSection hotel={hotel} location={location} roomNumber={user.roomNumber} />
            <DocumentsViewSection passportPhotos={passportPhotos} driverLicensePhotos={driverLicensePhotos} />
        </div>
    );
}

export default memo(ProfileForm);
