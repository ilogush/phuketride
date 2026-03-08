import { TrashIcon } from '@heroicons/react/24/outline'
import Button from './Button'

interface DeleteButtonProps {
    onClick?: () => void
    disabled?: boolean
    title?: string
    className?: string
    type?: 'button' | 'submit'
    size?: 'sm' | 'md' | 'lg'
}

export default function DeleteButton({
    onClick,
    disabled = false,
    title = "Delete",
    className = "",
    type = "button",
    size = "md"
}: DeleteButtonProps) {
    return (
        <Button
            type={type}
            onClick={onClick}
            disabled={disabled}
            variant="ghost"
            size={size}
            className={`text-gray-400 hover:text-gray-900 ${className}`}
            title={title}
            icon={<TrashIcon className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`} />}
        />
    )
}
