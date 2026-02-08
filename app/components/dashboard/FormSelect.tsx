import { memo } from "react";
import { selectBaseStyles } from "~/lib/styles/input";

interface FormSelectProps {
    label: string;
    name: string;
    value?: string | number | null;
    defaultValue?: string | number | null;
    options: Array<{ id: number | string; name: string }>;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    isEdit?: boolean;
    className?: string;
}

const FormSelect = memo(function FormSelect({
    label,
    name,
    value,
    defaultValue,
    options,
    placeholder,
    required = false,
    disabled = false,
    isEdit = true,
    className = "",
}: FormSelectProps) {
    const isFieldDisabled = disabled || !isEdit;

    // Use value for controlled (disabled) fields, defaultValue for editable fields
    const selectValue = isFieldDisabled ? (value ?? defaultValue ?? "") : undefined;
    const selectDefaultValue = !isFieldDisabled ? (defaultValue ?? value ?? "") : undefined;

    return (
        <div className={className}>
            <label className="block text-xs text-gray-600 mb-1">{label}</label>
            <select
                name={name}
                defaultValue={selectDefaultValue}
                value={selectValue}
                disabled={isFieldDisabled}
                className={selectBaseStyles}
                required={required}
            >
                <option value="">{placeholder || `Select ${label}`}</option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </div>
    );
});

export default FormSelect;
