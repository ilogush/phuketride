import { forwardRef, type InputHTMLAttributes } from "react";
import AuthFormField from "~/components/public/AuthFormField";

type AuthTextInputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
    error?: string;
    inputClassName?: string;
};

const baseClassName =
    "h-10 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900";

const AuthTextInput = forwardRef<HTMLInputElement, AuthTextInputProps>(function AuthTextInput(
    { className = "", inputClassName = "", id, label, hint, error, required, ...props },
    ref
) {
    const input = (
        <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            className={`${baseClassName} ${error ? "border-red-500 focus:border-red-600 focus:ring-red-600" : ""} ${inputClassName} ${className}`.trim()}
            required={required}
            {...props}
        />
    );

    if (!label || !id) {
        return input;
    }

    return (
        <AuthFormField id={id} label={label} required={required} hint={hint} error={error}>
            {input}
        </AuthFormField>
    );
});

export default AuthTextInput;
