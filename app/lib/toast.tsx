import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import ToastContainer from '~/components/dashboard/ToastContainer'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
    id: string
    message: string
    type: ToastType
    duration?: number
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => Promise<void>
    success: (message: string, duration?: number) => Promise<void>
    error: (message: string, duration?: number) => Promise<void>
    warning: (message: string, duration?: number) => Promise<void>
    info: (message: string, duration?: number) => Promise<void>
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    const showToast = useCallback(
        async (message: string, type: ToastType = 'info', duration: number = 5000) => {
            const id = Math.random().toString(36).substring(2, 9)
            const newToast: Toast = { id, message, type, duration }

            setToasts((prev) => [...prev, newToast])

            if (duration > 0) {
                setTimeout(() => {
                    removeToast(id)
                }, duration)
            }
        },
        [removeToast]
    )

    const success = useCallback(
        async (message: string, duration?: number) => await showToast(message, 'success', duration),
        [showToast]
    )

    const error = useCallback(
        async (message: string, duration?: number) => await showToast(message, 'error', duration),
        [showToast]
    )

    const warning = useCallback(
        async (message: string, duration?: number) => await showToast(message, 'warning', duration),
        [showToast]
    )

    const info = useCallback(
        async (message: string, duration?: number) => await showToast(message, 'info', duration),
        [showToast]
    )

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}
