import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '~/components/dashboard/Button'

interface ModalProps {
    title: string
    children: ReactNode
    onClose: () => void
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'large'
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'large'
    isOpen?: boolean
    actions?: ReactNode
}

export default function Modal({ title, children, onClose, maxWidth, size, isOpen = true, actions }: ModalProps) {
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

    if (!isOpen || !mounted) return null

    const content = (
        <div className="fixed inset-0 bg-gray-100 backdrop-blur-xl flex items-center justify-center z-[9999] p-4" onClick={onClose}>
            <div className={`bg-white border border-gray-200 rounded-3xl w-full ${maxWidthClasses[width]} shadow-xl max-h-[90vh] overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center px-4 py-3 sm:py-4 bg-gray-50/50 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                        {title}
                    </h2>
                    <Button
                        type="button"
                        variant="unstyled"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-300 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                </div>

                <div className="overflow-y-auto flex-1 p-4 sm:p-6">
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
