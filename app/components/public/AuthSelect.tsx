import { forwardRef, type SelectHTMLAttributes } from "react";

type AuthSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const baseClassName =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-gray-900 focus:ring-2 focus:ring-gray-900";

const AuthSelect = forwardRef<HTMLSelectElement, AuthSelectProps>(function AuthSelect(
    { className = "", children, ...props },
    ref
) {
    return (
        <select ref={ref} className={`${baseClassName} ${className}`.trim()} {...props}>
            {children}
        </select>
    );
});

export default AuthSelect;
