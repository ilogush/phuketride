import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useNavigation } from 'react-router'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
    children?: ReactNode
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    variant?: 'primary' | 'secondary' | 'ghost' | 'unstyled'
    size?: 'sm' | 'md' | 'lg'
    icon?: ReactNode
    iconPosition?: 'left' | 'right'
    fullWidth?: boolean
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
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
    loading = false,
    ...rest
}: ButtonProps) {
    const navigation = useNavigation()
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSubmitClicked, setIsSubmitClicked] = useState(false)

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isProcessing || disabled || loading) {
            e.preventDefault()
            return
        }

        if (type === 'submit' && isSubmitClicked) {
            e.preventDefault()
            return
        }

        if (type === 'submit') {
            // Show spinner immediately and block double click without forcing manual submit.
            setIsSubmitClicked(true)
            onClick?.(e)
            if (e.defaultPrevented) {
                setIsSubmitClicked(false)
            }
            return
        }

        if (!onClick) {
            return
        }

        setIsProcessing(true)
        try {
            await onClick(e)
        } finally {
            setIsProcessing(false)
        }
    }

    const isNavigating = navigation.state === 'submitting' || navigation.state === 'loading'
    const isSubmitting = type === 'submit' && (isSubmitClicked || isNavigating)

    useEffect(() => {
        if (navigation.state === 'idle') {
            setIsSubmitClicked(false)
        }
    }, [navigation.state])

    const isDisabled = disabled || loading || isProcessing || (type === 'submit' && isNavigating)

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
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-transparent font-medium',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent font-medium',
        unstyled: ''
    }

    const buttonClasses = [
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        roundedClasses[rounded],
        fullWidth && 'w-full',
        icon && children && 'space-x-1.5',
        type === 'submit' && isSubmitClicked && 'pointer-events-none',
        className
    ].filter(Boolean).join(' ')

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={isDisabled}
            className={buttonClasses}
            {...rest}
        >
            {(loading || isProcessing || isSubmitting) ? (
                <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {children && <span className="ml-2 opacity-70">{children}</span>}
                </>
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
