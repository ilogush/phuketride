import { forwardRef } from "react";
import { selectBaseStyles, selectErrorStyles } from "~/lib/styles/input";

export interface SelectOption {
    id: number | string;
    name: string;
    count?: number;
    volume?: number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: SelectOption[];
    placeholder?: string;
    hidePlaceholderOption?: boolean;
    showPlaceholderOption?: boolean;
    isEdit?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            options,
            placeholder,
            hidePlaceholderOption = true,
            showPlaceholderOption,
            required = false,
            className = "",
            id,
            name,
            disabled,
            isEdit = true,
            ...props
        },
        ref
    ) => {
        const baseStyle = error ? selectErrorStyles : selectBaseStyles;
        const isFieldDisabled = disabled || !isEdit;
        const shouldShowPlaceholderOption = showPlaceholderOption ?? !hidePlaceholderOption;

        return (
            <div className={className}>
                {label && (
                    <label htmlFor={id || name} className="block text-xs text-gray-600 mb-1">
                        {label} {required && <span className="text-gray-500">*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    id={id || name}
                    name={name}
                    disabled={isFieldDisabled}
                    className={baseStyle}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                            e.stopPropagation()
                        }
                        if (props.onKeyDown) props.onKeyDown(e)
                    }}
                    {...props}
                >
                    {shouldShowPlaceholderOption && (
                        <option value="">{placeholder || `Select ${label || "option"}`}</option>
                    )}
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
