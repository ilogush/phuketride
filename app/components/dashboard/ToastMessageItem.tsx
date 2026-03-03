import type { Toast } from '~/lib/toast'

interface ToastItemProps {
    toast: Toast
    onRemove: (id: string) => void
}

const TOAST_STYLES: Record<Toast['type'], string> = {
    success: 'border-emerald-500 bg-emerald-50 text-emerald-900',
    error: 'border-red-500 bg-red-50 text-red-900',
    warning: 'border-amber-500 bg-amber-50 text-amber-900',
    info: 'border-sky-500 bg-sky-50 text-sky-900',
}

export default function ToastItem({ toast, onRemove }: ToastItemProps) {
    return (
        <div
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md ${TOAST_STYLES[toast.type]}`}
            role="status"
            aria-live="polite"
        >
            <p className="flex-1 text-sm leading-5">{toast.message}</p>
            <button
                type="button"
                onClick={() => onRemove(toast.id)}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium opacity-80 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
                aria-label="Dismiss notification"
            >
                Dismiss
            </button>
        </div>
    )
}
