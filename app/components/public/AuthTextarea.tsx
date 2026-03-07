import { forwardRef, type TextareaHTMLAttributes } from "react";
import AuthFormField from "~/components/public/AuthFormField";

type AuthTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    hint?: string;
    error?: string;
    inputClassName?: string;
};

const baseClassName =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900";

const AuthTextarea = forwardRef<HTMLTextAreaElement, AuthTextareaProps>(function AuthTextarea(
    { className = "", inputClassName = "", id, label, hint, error, required, rows = 4, ...props },
    ref
) {
    const textarea = (
        <textarea
            ref={ref}
            id={id}
            rows={rows}
            aria-invalid={error ? true : undefined}
            required={required}
            className={`${baseClassName} ${error ? "border-red-500 focus:border-red-600 focus:ring-red-600" : ""} ${inputClassName} ${className}`.trim()}
            {...props}
        />
    );

    if (!label || !id) {
        return textarea;
    }

    return (
        <AuthFormField id={id} label={label} required={required} hint={hint} error={error}>
            {textarea}
        </AuthFormField>
    );
});

export default AuthTextarea;
