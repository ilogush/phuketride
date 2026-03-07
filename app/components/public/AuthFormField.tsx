import type { ReactNode } from "react";
import FormFeedbackMessage from "~/components/shared/FormFeedbackMessage";

type AuthFormFieldProps = {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: ReactNode;
};

export default function AuthFormField({
    id,
    label,
    required = false,
    hint,
    error,
    children,
}: AuthFormFieldProps) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                {label}
                {required ? <span className="text-red-500"> *</span> : null}
            </label>
            {children}
            <FormFeedbackMessage message={hint} tone="hint" className="text-xs" />
            <FormFeedbackMessage message={error} tone="error" className="text-sm" />
        </div>
    );
}
