import { forwardRef, type SelectHTMLAttributes } from "react";
import AuthFormField from "~/components/public/AuthFormField";

type AuthSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    hint?: string;
    error?: string;
    inputClassName?: string;
};

const baseClassName =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-gray-900 focus:ring-2 focus:ring-gray-900";

const AuthSelect = forwardRef<HTMLSelectElement, AuthSelectProps>(function AuthSelect(
    { className = "", inputClassName = "", children, id, label, hint, error, required, ...props },
    ref
) {
    const select = (
        <select
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            required={required}
            className={`${baseClassName} ${error ? "border-red-500 focus:border-red-600 focus:ring-red-600" : ""} ${inputClassName} ${className}`.trim()}
            {...props}
        >
            {children}
        </select>
    );

    if (!label || !id) {
        return select;
    }

    return (
        <AuthFormField id={id} label={label} required={required} hint={hint} error={error}>
            {select}
        </AuthFormField>
    );
});

export default AuthSelect;
