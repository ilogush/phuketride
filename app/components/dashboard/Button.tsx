import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useButtonInteraction } from '~/lib/useButtonInteraction'

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'plain'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
    children?: ReactNode
    onClick?: (e?: MouseEvent<HTMLButtonElement>) => void | Promise<void>
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    variant?: ButtonVariant
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
    variant = 'solid',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    rounded = 'xl',
    loading = false,
    ...rest
}: ButtonProps) {
    const { handleClick, isDisabled, isLoading, isSubmitClicked } = useButtonInteraction({
        disabled,
        loading,
        onClick,
        type,
    })

    const baseClasses = 'inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

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
        solid: 'bg-gray-800 text-white border border-transparent hover:bg-gray-700 font-medium',
        outline: 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-transparent font-medium',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent font-medium',
        plain: ''
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
            {isLoading ? (
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
