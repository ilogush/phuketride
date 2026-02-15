import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigation } from 'react-router'

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
    const navigation = useNavigation()
    const [isProcessing, setIsProcessing] = useState(false)
    const [isClicked, setIsClicked] = useState(false)

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

    // Для submit кнопок отслеживаем клик
    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (type === 'submit') {
            setIsClicked(true)
        }
    }

    // Автоматическое определение загрузки для submit кнопок
    // Проверяем состояние навигации (submitting или loading)
    const isNavigating = navigation.state === 'submitting' || navigation.state === 'loading'
    const isSubmitting = type === 'submit' && isClicked && isNavigating
    
    // Сбрасываем флаг клика когда навигация завершена
    if (isClicked && navigation.state === 'idle') {
        setIsClicked(false)
    }
    
    const isDisabled = disabled || loading || isProcessing || isSubmitting

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
            onClick={type === 'button' ? handleClick : handleSubmit}
            disabled={isDisabled}
            form={form}
            title={title}
            className={buttonClasses}
        >
            {isDisabled && (loading || isProcessing || isSubmitting) ? (
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
