import { ReactNode } from 'react'
import Button from './Button'
import { Link } from 'react-router'

interface PageActionsProps {
    actionLabel?: string
    actionIcon?: ReactNode
    actionType?: 'button' | 'submit' | 'link'
    href?: string
    onAction?: () => void | Promise<void>
    formId?: string
    loading?: boolean
    disabled?: boolean
    variant?: 'primary' | 'secondary' | 'delete'
    customActions?: ReactNode
    className?: string
}

export default function PageActions({
    actionLabel,
    actionIcon,
    actionType = 'button',
    href,
    onAction,
    formId,
    loading,
    disabled,
    variant = 'primary',
    customActions,
    className = ''
}: PageActionsProps) {
    const renderButton = () => (
        <Button
            variant={variant}
            onClick={actionType === 'button' ? onAction : undefined}
            type={actionType === 'submit' ? 'submit' : 'button'}
            form={formId}
            disabled={disabled}
            loading={loading}
            icon={actionIcon}
            className={actionType === 'submit' ? 'px-4' : ''}
        >
            {actionLabel}
        </Button>
    )

    const actions = customActions || (actionLabel ? (
        actionType === 'link' && href ? (
            <Link to={href}>
                {renderButton()}
            </Link>
        ) : (
            renderButton()
        )
    ) : null)

    if (!actions) return null

    return (
        <div className={`flex justify-end items-center space-x-3 pt-6 mt-8 ${className}`}>
            {actions}
        </div>
    )
}
