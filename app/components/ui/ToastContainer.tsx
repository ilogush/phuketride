import { Toast } from '~/lib/toast'
import ToastItem from '../shared/ToastItem'

interface ToastContainerProps {
    toasts: Toast[]
    onRemove: (id: string) => void
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-[50000] flex flex-col gap-2 max-w-md w-full">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    )
}
