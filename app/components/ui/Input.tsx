import React, { forwardRef, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { inputBaseStyles, inputErrorStyles } from '~/lib/styles/input'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    addonLeft?: ReactNode
    addonRight?: ReactNode
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
    type,
    placeholder,
    value,
    onChange,
    onFocus,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasUserInput, setHasUserInput] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

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

    const baseStyle = error ? inputErrorStyles : inputBaseStyles
    const inputClasses = `${baseStyle} ${disabled ? '!bg-gray-200 cursor-not-allowed !text-gray-800 !border-gray-200' : ''} ${addonLeft ? 'rounded-l-none' : ''} ${isPassword ? 'rounded-r-none' : ''} ${addonRight && !isPassword ? 'rounded-r-none' : ''}`

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
        <div className={`mt-2 ${className}`}>
            {label && (
                <label htmlFor={id || name} className="block text-xs text-gray-600 mb-1">
                    {label} {required && <span className="text-gray-500">*</span>}
                </label>
            )}
            <div className={`${(addonLeft || addonRight || isPassword) ? 'flex' : ''} rounded-lg`}>
                {addonLeft && (
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-500 sm:text-sm">
                        {addonLeft}
                    </span>
                )}
                <input
                    ref={ref}
                    id={id || name}
                    name={name}
                    type={inputType}
                    disabled={disabled}
                    className={inputClasses}
                    placeholder={shouldShowPlaceholder ? placeholder : ''}
                    {...(value !== undefined ? { value } : {})}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        {showPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                            <EyeIcon className="w-5 h-5" />
                        )}
                    </button>
                )}
                {!isPassword && addonRight && (
                    <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 text-gray-500 sm:text-sm">
                        {addonRight}
                    </span>
                )}
            </div>
            {error && (
                <p className="mt-1 text-sm text-gray-700 font-medium">{error}</p>
            )}
        </div>
    )
})

Input.displayName = 'Input'
