import type { ReactNode } from "react";

type AuthFormFieldProps = {
    id: string;
    label: string;
    required?: boolean;
    children: ReactNode;
};

export default function AuthFormField({ id, label, required = false, children }: AuthFormFieldProps) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                {label}
                {required ? <span className="text-red-500"> *</span> : null}
            </label>
            {children}
        </div>
    );
}
