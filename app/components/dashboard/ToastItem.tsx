import type { Toast } from '~/lib/toast'
import {
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'

interface ToastItemProps {
    toast: Toast
    onRemove: (id: string) => void
}

const toastConfig = {
    success: {
        icon: CheckCircleIcon,
        iconColor: 'text-green-500',
        bgColor: 'bg-gray-800',
    },
    error: {
        icon: XCircleIcon,
        iconColor: 'text-red-500',
        bgColor: 'bg-gray-800',
    },
    warning: {
        icon: ExclamationTriangleIcon,
        iconColor: 'text-yellow-500',
        bgColor: 'bg-gray-800',
    },
    info: {
        icon: InformationCircleIcon,
        iconColor: 'text-blue-500',
        bgColor: 'bg-gray-800',
    },
}

export default function ToastItem({ toast, onRemove }: ToastItemProps) {
    const config = toastConfig[toast.type]
    const Icon = config.icon

    return (
        <div
            className="pointer-events-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-4 flex items-center gap-3 transition-all duration-500 ease-out transform animate-in fade-in slide-in-from-right-8"
            role="alert"
        >
            <div className="flex-shrink-0">
                <Icon className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{toast.message}</p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                aria-label="Close"
            >
                <XMarkIcon className="h-4 w-4" />
            </button>
        </div>
    )
}
