import { forwardRef } from "react";
import { selectBaseStyles, selectErrorStyles } from "~/lib/styles/input";

interface SelectOption {
    id: number | string;
    name: string;
    count?: number;
    volume?: number;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: SelectOption[];
    placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            options,
            placeholder,
            required = false,
            className = "",
            id,
            name,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyle = error ? selectErrorStyles : selectBaseStyles;
        const selectClasses = `${baseStyle} ${disabled ? "!bg-gray-200 cursor-not-allowed !text-gray-800 !border-gray-200" : ""
            }`;

        return (
            <div className={`mt-2 ${className}`}>
                {label && (
                    <label htmlFor={id || name} className="block text-xs text-gray-600 mb-1">
                        {label} {required && <span className="text-gray-500">*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    id={id || name}
                    name={name}
                    disabled={disabled}
                    className={selectClasses}
                    {...props}
                >
                    <option value="">{placeholder || `Select ${label || "option"}`}</option>
                    {options.map((option) => {
                        const displayName = option.count !== undefined
                            ? option.count.toString()
                            : option.volume !== undefined
                                ? option.volume.toString()
                                : option.name;

                        return (
                            <option key={option.id} value={option.id}>
                                {displayName}
                            </option>
                        );
                    })}
                </select>
                {error && <p className="mt-1 text-sm text-gray-700 font-medium">{error}</p>}
            </div>
        );
    }
);

Select.displayName = "Select";
