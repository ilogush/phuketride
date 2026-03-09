import { useCallback, useMemo, useState } from "react";
import type { DocumentPhoto } from "~/components/dashboard/DocumentPreview";
import { getInitials, parseJSON } from "~/lib/formatters";
import { useLatinValidation } from "~/lib/useLatinValidation";
import type { ProfileFormProps } from "./profile-form.types";

export function useProfileFormState({ user, onPhotoChange }: Pick<ProfileFormProps, "user" | "onPhotoChange">) {
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const { validateLatinInput } = useLatinValidation();

  const initials = getInitials(user.name, user.surname, user.email);
  const passportPhotos = useMemo(
    () => parseJSON<DocumentPhoto[]>(user.passportPhotos),
    [user.passportPhotos],
  );
  const driverLicensePhotos = useMemo(
    () => parseJSON<DocumentPhoto[]>(user.driverLicensePhotos),
    [user.driverLicensePhotos],
  );

  const [passportUploads, setPassportUploads] = useState<DocumentPhoto[]>(passportPhotos || []);
  const [driverLicenseUploads, setDriverLicenseUploads] = useState<DocumentPhoto[]>(
    driverLicensePhotos || [],
  );

  const handlePhotoChange = useCallback(
    (base64: string | null, fileName: string | null) => {
      setAvatarBase64(base64);
      setAvatarFileName(fileName);
      setRemoveAvatar(!base64);
      onPhotoChange?.(base64, fileName);
    },
    [onPhotoChange],
  );

  return {
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
  };
}
