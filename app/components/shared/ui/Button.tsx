import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useButtonInteraction } from '~/lib/useButtonInteraction'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'solid' | 'outline' | 'plain'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
    children?: ReactNode
    onClick?: (e?: MouseEvent<HTMLButtonElement>) => void | Promise<void>
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
    variant?: ButtonVariant
    size?: 'sm' | 'md' | 'lg'
    icon?: ReactNode
    leadingIcon?: ReactNode
    trailingIcon?: ReactNode
    iconPosition?: 'left' | 'right'
    iconOnly?: boolean
    fullWidth?: boolean
    rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'none'
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
    leadingIcon,
    trailingIcon,
    iconPosition = 'left',
    iconOnly = false,
    fullWidth = false,
    rounded = 'xl',
    loading = false,
    ...rest
}: ButtonProps) {
    const { handleClick, isDisabled, isLoading } = useButtonInteraction({
        disabled,
        loading,
        onClick,
        type,
    })

    const resolvedLeadingIcon = leadingIcon ?? (iconPosition === 'left' ? icon : undefined)
    const resolvedTrailingIcon = trailingIcon ?? (iconPosition === 'right' ? icon : undefined)
    const hasOnlyIcon = iconOnly || (!children && Boolean(resolvedLeadingIcon || resolvedTrailingIcon))
    const hasExplicitSquareSize = /\bw-\d+\b/.test(className) && /\bh-\d+\b/.test(className)
    const isIconButton = hasOnlyIcon && hasExplicitSquareSize

    const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 outline-none focus:outline-none focus:ring-4 focus:ring-gray-900/5 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]'
    
    // Auto-adjust size if it's an icon-only button and has custom w- h- classes
    const sizeClasses = isIconButton ? '' : {
        sm: 'px-3 h-8 text-xs sm:text-sm',
        md: 'px-4 h-11 text-xs sm:text-sm',
        lg: 'px-6 h-12 text-sm sm:text-base'
    }[size];

    const roundedClasses = {
        sm: 'rounded-lg',
        md: 'rounded-xl',
        lg: 'rounded-xl',
        xl: 'rounded-xl',
        full: 'rounded-full',
        none: ''
    }

    const normalizedVariant: Exclude<ButtonVariant, 'solid' | 'outline' | 'plain'> =
        variant === 'solid'
            ? 'primary'
            : variant === 'outline' || variant === 'plain'
                ? 'secondary'
                : variant

    const variantClasses = {
        primary: 'bg-gray-900 text-white border border-gray-900 hover:bg-gray-800',
        secondary: 'bg-gray-200 text-gray-900 border border-gray-200 hover:bg-gray-300',
        ghost: 'bg-gray-200 text-gray-900 border border-gray-200 hover:bg-gray-300',
        danger: 'bg-gray-900 text-white border border-gray-900 hover:bg-gray-800'
    }

    const buttonClasses = [
        baseClasses,
        variantClasses[normalizedVariant],
        sizeClasses,
        roundedClasses[rounded],
        fullWidth && 'w-full',
        (resolvedLeadingIcon || resolvedTrailingIcon) && children && 'gap-2',
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
                <div className="flex items-center justify-center pointer-events-none">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {children && <span className="ml-2.5 opacity-70">{children}</span>}
                </div>
            ) : (
                <>
                    {resolvedLeadingIcon && <span className="flex-shrink-0">{resolvedLeadingIcon}</span>}
                    {children && <span className="truncate">{children}</span>}
                    {resolvedTrailingIcon && <span className="flex-shrink-0">{resolvedTrailingIcon}</span>}
                </>
            )}
        </button>
    )
}
