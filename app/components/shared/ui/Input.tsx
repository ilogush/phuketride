import React, { forwardRef, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import FormFeedbackMessage from '~/components/shared/FormFeedbackMessage'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    hint?: string
    addonLeft?: ReactNode
    addonRight?: ReactNode
    startAdornment?: ReactNode
    endAdornment?: ReactNode
    isEdit?: boolean
    fieldClassName?: string
    containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    hint,
    required = false,
    className = '',
    id,
    name,
    addonLeft,
    addonRight,
    startAdornment,
    endAdornment,
    disabled,
    isEdit = true,
    readOnly,
    type,
    placeholder,
    value,
    onChange,
    onFocus,
    onBlur,
    fieldClassName = '',
    containerClassName = '',
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasUserInput, setHasUserInput] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const isFieldDisabled = disabled || !isEdit
    const resolvedStartAdornment = startAdornment ?? addonLeft
    const resolvedEndAdornment = endAdornment ?? addonRight

    // Check if this is a numeric field with zero-like placeholder
    const isNumericWithZeroPlaceholder = type === 'number' && placeholder &&
        (placeholder.includes('0') || placeholder === '0.00' || placeholder === '0')

    // Check if this is a password field
    const isPassword = type === 'password'

    // Track if user has actually typed something
    useEffect(() => {
        if (value && value !== '' && value !== '0' && value !== '0.00') {
            setHasUserInput(true)
        }
    }, [value])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true)
        if (onFocus) onFocus(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false)
        if (onBlur) onBlur(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value

        // For numeric fields, track user input
        if (isNumericWithZeroPlaceholder && newValue !== '') {
            setHasUserInput(true)
        }

        if (onChange) onChange(e)
    }

    // Show placeholder only when not focused and no user input for numeric fields
    const shouldShowPlaceholder = isNumericWithZeroPlaceholder
        ? (!isFocused && !hasUserInput && (!value || value === '' || value === '0' || value === '0.00'))
        : true


    // Inner input classes
    const innerInputClasses = `
        block w-full border-0 focus:ring-0 bg-transparent text-sm py-2.5 h-full 
        placeholder:text-xs placeholder:font-normal placeholder:normal-case placeholder:text-gray-400 focus:outline-none transition-all duration-200
        ${resolvedStartAdornment ? 'pl-2' : 'pl-4'}
        ${(isPassword || resolvedEndAdornment) ? 'pr-2' : 'pr-4'}
        ${isFieldDisabled ? 'cursor-not-allowed text-gray-400' : 'text-gray-900'}
        ${readOnly ? 'cursor-default' : ''}
        ${fieldClassName}
    `.trim()

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
    const normalizedLabel = typeof label === 'string' ? label.trim() : label
    const labelHasAsterisk = typeof normalizedLabel === 'string' && normalizedLabel.endsWith('*')
    const labelText = typeof normalizedLabel === 'string' && labelHasAsterisk
        ? normalizedLabel.slice(0, -1).trimEnd()
        : normalizedLabel

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id || name} className="block text-xs text-gray-600 mb-1 ml-1">
                    {labelText} {(required || labelHasAsterisk) && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <div className={`
                relative flex items-center border rounded-2xl bg-white h-11 overflow-hidden transition-all duration-200
                ${error 
                    ? 'border-red-200 bg-red-50/10 ring-1 ring-red-500/20' 
                    : isFocused 
                        ? 'border-gray-900 ring-4 ring-gray-900/5' 
                        : 'border-gray-200 hover:border-gray-300 shadow-none'}
                ${isFieldDisabled ? 'bg-gray-50/50 border-gray-100' : 'bg-white'}
                ${readOnly ? 'bg-gray-50/20' : ''}
                ${containerClassName}
            `}>
                {resolvedStartAdornment && (
                    <span className="inline-flex items-center pl-4 text-gray-400 font-medium sm:text-sm">
                        {resolvedStartAdornment}
                    </span>
                )}
                <input
                    ref={ref}
                    id={id || name}
                    name={name}
                    type={inputType}
                    disabled={isFieldDisabled}
                    readOnly={readOnly}
                    className={innerInputClasses}
                    placeholder={shouldShowPlaceholder ? placeholder : ''}
                    {...(value !== undefined ? { value } : {})}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                            e.stopPropagation()
                        }
                        if (props.onKeyDown) props.onKeyDown(e)
                    }}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="inline-flex items-center px-4 text-gray-400 hover:text-gray-900 focus:outline-none transition-colors"
                        disabled={isFieldDisabled}
                    >
                        {showPassword ? (
                            <EyeSlashIcon className="w-5 h-5 transition-transform active:scale-95" />
                        ) : (
                            <EyeIcon className="w-5 h-5 transition-transform active:scale-95" />
                        )}
                    </button>
                )}
                {!isPassword && resolvedEndAdornment && (
                    <span className="inline-flex items-center pr-4 text-gray-500 font-semibold sm:text-xs tracking-tight bg-gray-50/50 self-stretch px-3 border-l border-gray-100">
                        {resolvedEndAdornment}
                    </span>
                )}
            </div>
            <FormFeedbackMessage message={hint} tone="hint" className="mt-1 ml-1 text-xs" />
            {error && (
                <div className="flex items-center gap-1.5 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    <p className="text-[11px] font-bold text-red-600 uppercase tracking-tight">{error}</p>
                </div>
            )}
        </div>
    )
})

Input.displayName = 'Input'
