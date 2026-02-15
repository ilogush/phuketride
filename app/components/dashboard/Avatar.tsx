import { memo } from "react";

interface AvatarProps {
    src?: string | null;
    initials: string;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

const Avatar = memo(function Avatar({
    src,
    initials,
    size = "md",
    className = "",
}: AvatarProps) {
    const sizeClasses = {
        sm: "w-10 h-10 text-sm",
        md: "w-10 h-10 text-xl",
        lg: "w-20 h-20 text-2xl",
        xl: "w-32 h-32 text-4xl",
    };

    if (src) {
        return (
            <img
                src={src}
                alt="Avatar"
                className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 ${className}`}
            />
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
        >
            {initials}
        </div>
    );
});

export default Avatar;
