import type { ReactNode } from 'react'
import { useState } from 'react'

interface ButtonProps {
    children?: ReactNode
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    variant?: 'primary' | 'secondary'
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

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isProcessing || disabled || loading) return
        if (!onClick) return

        setIsProcessing(true)
        try {
            await onClick(e)
        } finally {
            setIsProcessing(false)
        }
    }

    const isDisabled = disabled || loading || isProcessing

    const baseClasses = 'flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

    const sizeClasses = {
        sm: 'px-2 sm:px-3 py-1 text-xs sm:text-sm',
        md: 'px-3 sm:px-4 py-2 text-xs sm:text-sm',
        lg: 'px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base'
    }

    const roundedClasses = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-xl',
        xl: 'rounded-xl',
        full: 'rounded-full'
    }

    const variantClasses = {
        primary: 'bg-gray-800 text-white border border-transparent hover:bg-gray-700 font-medium',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-transparent font-medium'
    }

    const buttonClasses = [
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        roundedClasses[rounded],
        fullWidth && 'w-full',
        icon && children && 'space-x-1.5',
        className
    ].filter(Boolean).join(' ')

    return (
        <button
            type={type}
            onClick={type === 'button' ? handleClick : undefined}
            disabled={isDisabled}
            form={form}
            title={title}
            className={buttonClasses}
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
