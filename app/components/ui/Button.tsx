import type { ReactNode } from 'react'
import { useState } from 'react'

interface ButtonProps {
    children?: ReactNode
    onClick?: () => void | Promise<void>
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    variant?: 'primary' | 'secondary' | 'delete' | 'destructive'
    size?: 'sm' | 'md' | 'lg'
    icon?: ReactNode
    iconPosition?: 'left' | 'right'
    fullWidth?: boolean
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    form?: string
    title?: string
    loading?: boolean
}

export default function Button({
    children,
    onClick,
    disabled,
    type = 'button',
    className = '',
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    rounded = 'xl',
    form,
    title,
    loading = false
}: ButtonProps) {
    const [isProcessing, setIsProcessing] = useState(false)

    const handleClick = async () => {
        if (isProcessing || disabled || loading) return
        if (!onClick) return

        setIsProcessing(true)
        try {
            await onClick()
        } finally {
            setIsProcessing(false)
        }
    }

    const isDisabled = disabled || loading || isProcessing

    const baseClasses = 'flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'p-4 text-sm',
        lg: 'p-4 text-base'
    }

    const roundedClasses = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full'
    }

    const variantClasses = {
        primary: 'bg-gray-800 text-white border border-transparent hover:bg-gray-700 font-medium',
        secondary: 'bg-gray-200 text-gray-800 border border-gray-200 hover:bg-gray-300 font-medium',
        delete: 'bg-gray-300 text-gray-800 border border-gray-100 hover:bg-gray-200 transition-all font-medium',
        destructive: 'bg-red-600 text-white border border-transparent hover:bg-red-700 font-medium'
    }

    const widthClass = fullWidth ? 'w-full' : ''
    const gapClass = icon && children ? 'space-x-1.5' : ''

    return (
        <button
            type={type}
            onClick={type === 'button' ? handleClick : undefined}
            disabled={isDisabled}
            form={form}
            title={title}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClasses[rounded]} ${widthClass} ${gapClass} ${className}`}
        >
            {isDisabled && (loading || isProcessing) ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <>
                    {icon && iconPosition === 'left' && <span>{icon}</span>}
                    {children && <span>{children}</span>}
                    {icon && iconPosition === 'right' && <span>{icon}</span>}
                </>
            )}
        </button>
    )
}
