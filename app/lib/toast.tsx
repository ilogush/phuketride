import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
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
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    const clearToastTimer = useCallback((id: string) => {
        const timer = timersRef.current.get(id)
        if (timer) {
            clearTimeout(timer)
            timersRef.current.delete(id)
        }
    }, [])

    const removeToast = useCallback((id: string) => {
        clearToastTimer(id)
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [clearToastTimer])

    useEffect(() => {
        return () => {
            for (const timer of timersRef.current.values()) {
                clearTimeout(timer)
            }
            timersRef.current.clear()
        }
    }, [])

    // Resilient timer management: watches the toasts array and sets timers for any new toast
    useEffect(() => {
        toasts.forEach((toast) => {
            if (toast.duration && toast.duration > 0 && !timersRef.current.has(toast.id)) {
                const timer = setTimeout(() => {
                    removeToast(toast.id)
                }, toast.duration)
                timersRef.current.set(toast.id, timer)
            }
        })
    }, [toasts, removeToast])

    const showToast = useCallback(
        async (message: string, type: ToastType = 'info', duration: number = 3000) => {
            const newId = `toast-${Date.now()}-${Math.random()}`
            const newToast: Toast = { id: newId, message, type, duration }

            setToasts((prev) => [...prev, newToast])
        },
        []
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
