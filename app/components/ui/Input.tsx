import React, { forwardRef, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { inputBaseStyles, inputErrorStyles } from '~/lib/styles/input'

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

    // Check if this is a numeric field with zero-like placeholder
    const isNumericWithZeroPlaceholder = type === 'number' && placeholder &&
        (placeholder.includes('0') || placeholder === '0.00' || placeholder === '0')

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
    const inputClasses = `${baseStyle} ${disabled ? 'bg-gray-200 cursor-not-allowed opacity-50' : ''} ${addonLeft ? 'rounded-l-none' : ''} ${addonRight ? 'rounded-r-none' : ''}`

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id || name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-gray-500">*</span>}
                </label>
            )}
            <div className={`${(addonLeft || addonRight) ? 'flex' : ''} rounded-lg`}>
                {addonLeft && (
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-500 sm:text-sm">
                        {addonLeft}
                    </span>
                )}
                <input
                    ref={ref}
                    id={id || name}
                    name={name}
                    type={type}
                    disabled={disabled}
                    className={inputClasses}
                    placeholder={shouldShowPlaceholder ? placeholder : ''}
                    value={value}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
                {addonRight && (
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
