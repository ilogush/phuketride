import { memo } from "react";
import { Input } from "./Input";

interface FormInputProps {
    label: string;
    name: string;
    type?: string;
    value?: string | number | null;
    defaultValue?: string | number | null;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    isEdit?: boolean;
    className?: string;
}

const FormInput = memo(function FormInput({
    label,
    name,
    type = "text",
    value,
    defaultValue,
    placeholder,
    required = false,
    disabled = false,
    isEdit = true,
    className = "",
}: FormInputProps) {
    const isFieldDisabled = disabled || !isEdit;

    // Use value for controlled (disabled) fields, defaultValue for editable fields
    const inputValue = isFieldDisabled ? (value ?? defaultValue ?? "") : undefined;
    const inputDefaultValue = !isFieldDisabled ? (defaultValue ?? value ?? "") : undefined;

    return (
        <Input
            label={label}
            name={name}
            type={type}
            value={isFieldDisabled ? (inputValue as string) : undefined}
            defaultValue={!isFieldDisabled ? (inputDefaultValue as string) : undefined}
            placeholder={placeholder}
            required={required}
            disabled={isFieldDisabled}
            className={className}
        />
    );
});

export default FormInput;
