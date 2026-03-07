import { forwardRef, type InputHTMLAttributes } from "react";

type AuthTextInputProps = InputHTMLAttributes<HTMLInputElement>;

const baseClassName =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900";

const AuthTextInput = forwardRef<HTMLInputElement, AuthTextInputProps>(function AuthTextInput(
    { className = "", ...props },
    ref
) {
    return <input ref={ref} className={`${baseClassName} ${className}`.trim()} {...props} />;
});

export default AuthTextInput;
