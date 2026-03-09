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
                    <label htmlFor={id || name} className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider ml-1">
                        {label} {required && <span className="text-red-400 ml-0.5">*</span>}
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
                {error && (
                    <div className="flex items-center gap-1.5 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="w-1 h-1 rounded-full bg-red-500" />
                        <p className="text-[11px] font-bold text-red-600 uppercase tracking-tight">{error}</p>
                    </div>
                )}
            </div>
        );
    }
);

Select.displayName = "Select";
