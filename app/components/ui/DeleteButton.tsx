import { TrashIcon } from '@heroicons/react/24/outline'
import Button from './Button'

interface DeleteButtonProps {
    onClick: () => void
    disabled?: boolean
    title?: string
    className?: string
}

export default function DeleteButton({
    onClick,
    disabled = false,
    title = "Delete",
    className = ""
}: DeleteButtonProps) {
    return (
        <Button
            type="button"
            onClick={onClick}
            disabled={disabled}
            variant="delete"
            className={className}
            title={title}
            icon={<TrashIcon className="w-5 h-5" />}
        />
    )
}
