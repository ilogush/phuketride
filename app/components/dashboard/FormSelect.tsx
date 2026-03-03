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
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
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
    onChange,
}: FormSelectProps) {
    const isFieldDisabled = disabled || !isEdit;

    // Determine if we should be controlled or uncontrolled
    const hasValue = value !== undefined;
    const selectValue = hasValue ? (value ?? "") : undefined;
    const selectDefaultValue = !hasValue ? (defaultValue ?? "") : undefined;

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
                onChange={onChange}
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
