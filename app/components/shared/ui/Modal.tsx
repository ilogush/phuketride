import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '~/components/shared/ui/Button'

interface ModalProps {
    title: string
    children: ReactNode
    onClose: () => void
    onOpenChange?: (open: boolean) => void
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'large'
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'large'
    open?: boolean
    closeOnBackdropClick?: boolean
    closeOnEscape?: boolean
    actions?: ReactNode
    ariaLabel?: string
}

export default function Modal({
    title,
    children,
    onClose,
    onOpenChange,
    maxWidth,
    size,
    open,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    actions,
    ariaLabel
}: ModalProps) {
    const titleId = useId()
    const resolvedOpen = open ?? true
    const width = size || maxWidth || 'md'
    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        large: 'max-w-4xl'
    }

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    const handleClose = () => {
        onOpenChange?.(false)
        onClose?.()
    }

    useEffect(() => {
        if (!resolvedOpen || !closeOnEscape) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [closeOnEscape, resolvedOpen])

    if (!resolvedOpen || !mounted) return null

    const content = (
        <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
            role={closeOnBackdropClick ? "button" : undefined}
            tabIndex={closeOnBackdropClick ? 0 : undefined}
            onClick={closeOnBackdropClick ? handleClose : undefined}
            onKeyDown={
                closeOnBackdropClick
                    ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              handleClose()
                          }
                      }
                    : undefined
            }
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={titleId}
                className={`bg-white ring-1 ring-black/5 rounded-3xl w-full ${maxWidthClasses[width]} max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 zoom-in-95 duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center px-6 py-5 bg-white border-b border-gray-100 flex-shrink-0">
                    <div className="flex flex-col gap-0.5">
                        <h2 id={titleId} className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                            {title}
                        </h2>
                        <div className="h-0.5 w-4 bg-gray-900 rounded-full" />
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                    {children}
                </div>

                {actions && (
                    <div className="flex justify-end items-center gap-3 px-6 py-5 bg-gray-50/50 border-t border-gray-100 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )

    if (typeof document === 'undefined') return null

    return createPortal(content, document.body)
}
