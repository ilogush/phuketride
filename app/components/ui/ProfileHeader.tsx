import { memo } from "react";

interface ProfileHeaderProps {
    name?: string | null;
    surname?: string | null;
    email: string;
    role: string;
    className?: string;
}

const ProfileHeader = memo(function ProfileHeader({
    name,
    surname,
    email,
    role,
    className = "",
}: ProfileHeaderProps) {
    const displayName = name && surname ? `${name} ${surname}` : email;
    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);

    return (
        <div className={`flex-1 ${className}`}>
            <h2 className="text-2xl font-semibold text-gray-900">{displayName}</h2>
            <p className="text-sm text-gray-600 mt-1">{formattedRole}</p>
        </div>
    );
});

export default ProfileHeader;
