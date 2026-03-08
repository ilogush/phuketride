import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '~/components/dashboard/Button'

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
            className="fixed inset-0 bg-gray-100 backdrop-blur-xl flex items-center justify-center z-[9999] p-4"
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
                className={`bg-white border border-gray-200 rounded-3xl w-full ${maxWidthClasses[width]} shadow-xl max-h-[90vh] overflow-hidden flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center px-4 py-3 sm:py-4 bg-gray-50/50 border-b border-gray-100 flex-shrink-0">
                    <h2 id={titleId} className="text-lg sm:text-xl font-semibold text-gray-900">
                        {title}
                    </h2>
                    <Button
                        type="button"
                        variant="plain"
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-300 transition-colors"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 sm:p-4">
                    {children}
                </div>

                {actions && (
                    <div className="flex justify-end items-center gap-2 sm:gap-3 px-4 py-3 sm:py-4 bg-gray-50/50 border-t border-gray-100 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )

    if (typeof document === 'undefined') return null

    return createPortal(content, document.body)
}
