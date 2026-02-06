import { useState, ReactNode } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Modal from './Modal'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void | Promise<void>
    title: string
    message: string | ReactNode
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}: ConfirmModalProps) {
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm()
            onClose()
        } catch (err) {
            console.error('Confirm action failed:', err)
        } finally {
            setLoading(false)
        }
    }

    const variantStyles = {
        danger: 'bg-gray-600 hover:bg-gray-700 text-white',
        warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        info: 'bg-blue-600 hover:bg-blue-700 text-white'
    }

    const iconStyles = {
        danger: 'text-gray-700 bg-gray-200',
        warning: 'text-yellow-600 bg-yellow-100',
        info: 'text-blue-600 bg-blue-100'
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="md"
            actions={
                <div className="flex justify-end space-x-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="py-4 text-sm font-medium text-gray-500 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`py-4 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${variantStyles[variant]}`}
                    >
                        {loading ? (
                            <span className="flex items-center space-x-2">
                                <span className="w-4 h-4 border-t-transparent rounded-full animate-spin" />
                                <span>Processing...</span>
                            </span>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            }
        >
            <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 p-2 rounded-full ${iconStyles[variant]}`}>
                    <ExclamationTriangleIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-600">{message}</p>
                </div>
            </div>
        </Modal>
    )
}
