import { forwardRef } from "react";
import FormFeedbackMessage from "~/components/shared/FormFeedbackMessage";
import { selectBaseStyles, selectErrorStyles } from "~/lib/styles/input";

export interface SelectOption {
    id: number | string;
    name: string;
    count?: number;
    volume?: number;
    value?: number | string;
    label?: string;
    disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
    hidePlaceholderOption?: boolean;
    showPlaceholderOption?: boolean;
    isEdit?: boolean;
    fieldClassName?: string;
    containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            label,
            error,
            hint,
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
            fieldClassName = "",
            containerClassName = "",
            ...props
        },
        ref
    ) => {
        const baseStyle = error ? selectErrorStyles : selectBaseStyles;
        const isFieldDisabled = disabled || !isEdit;
        const shouldShowPlaceholderOption = showPlaceholderOption ?? !hidePlaceholderOption;
        const normalizedLabel = typeof label === "string" ? label.trim() : label;
        const labelHasAsterisk = typeof normalizedLabel === "string" && normalizedLabel.endsWith("*");
        const labelText = typeof normalizedLabel === "string" && labelHasAsterisk
            ? normalizedLabel.slice(0, -1).trimEnd()
            : normalizedLabel;

        return (
            <div className={className}>
                {label && (
                    <label htmlFor={id || name} className="block text-xs text-gray-600 mb-1 ml-1">
                        {labelText} {(required || labelHasAsterisk) && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    id={id || name}
                    name={name}
                    disabled={isFieldDisabled}
                    className={`${baseStyle} ${fieldClassName}`.trim()}
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
                        const optionValue = option.value ?? option.id;
                        const displayName = option.label ?? (
                            option.count !== undefined
                            ? option.count.toString()
                            : option.volume !== undefined
                                ? option.volume.toString()
                                : option.name
                        );

                        return (
                            <option key={String(optionValue)} value={optionValue} disabled={option.disabled}>
                                {displayName}
                            </option>
                        );
                    })}
                </select>
                <FormFeedbackMessage message={hint} tone="hint" className={`mt-1 ml-1 text-xs ${containerClassName}`.trim()} />
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
