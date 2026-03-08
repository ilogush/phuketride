import React, { forwardRef, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import FormFeedbackMessage from '~/components/shared/FormFeedbackMessage'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    addonLeft?: ReactNode
    addonRight?: ReactNode
    isEdit?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    required = false,
    className = '',
    id,
    name,
    addonLeft,
    addonRight,
    disabled,
    isEdit = true,
    type,
    placeholder,
    value,
    onChange,
    onFocus,
    onBlur,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasUserInput, setHasUserInput] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const isFieldDisabled = disabled || !isEdit

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


    // Inner input classes - always used now
    const innerInputClasses = `
        block w-full border-0 focus:ring-0 bg-transparent text-sm py-2.5 h-full 
        placeholder:text-gray-400 focus:outline-none transition-colors
        ${addonLeft ? 'pl-2' : 'pl-4'}
        ${(isPassword || addonRight) ? 'pr-2' : 'pr-4'}
        ${isFieldDisabled ? 'cursor-not-allowed opacity-50' : ''}
    `.trim()

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id || name} className="block text-xs text-gray-600 mb-1">
                    {label} {required && <span className="text-gray-500">*</span>}
                </label>
            )}
            <div className={`
                flex items-center border rounded-xl bg-white transition-colors h-10 overflow-hidden
                ${error ? 'border-red-500' : 'border-gray-300 focus-within:border-gray-500'}
                ${isFieldDisabled ? 'bg-gray-50' : 'bg-white'}
            `}>
                {addonLeft && (
                    <span className="inline-flex items-center pl-3 text-gray-500 sm:text-sm">
                        {addonLeft}
                    </span>
                )}
                <input
                    ref={ref}
                    id={id || name}
                    name={name}
                    type={inputType}
                    disabled={isFieldDisabled}
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
                        className="inline-flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        disabled={isFieldDisabled}
                    >
                        {showPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                            <EyeIcon className="w-5 h-5" />
                        )}
                    </button>
                )}
                {!isPassword && addonRight && (
                    <span className="inline-flex items-center pr-3 text-gray-500 sm:text-sm">
                        {addonRight}
                    </span>
                )}
            </div>
            <FormFeedbackMessage message={error} tone="error" className="mt-1 text-sm font-medium" />
        </div>
    )
})

Input.displayName = 'Input'
