import Button from './Button'

interface FormActionsProps {
    submitLabel?: string
    cancelLabel?: string
    onCancel?: () => void
    submitDisabled?: boolean
    submitLoading?: boolean
    submitForm?: string
    className?: string
    align?: 'left' | 'center' | 'right'
}

export default function FormActions({
    submitLabel = 'Save',
    cancelLabel = 'Cancel',
    onCancel,
    submitDisabled = false,
    submitLoading = false,
    submitForm,
    className = '',
    align = 'right'
}: FormActionsProps) {
    const alignClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end'
    }

    const handleCancel = () => {
        if (onCancel) {
            onCancel()
        } else {
            window.history.back()
        }
    }

    return (
        <div className={`flex ${alignClasses[align]} gap-4 pt-6 ${className}`}>
            <Button variant="secondary" onClick={handleCancel}>
                {cancelLabel}
            </Button>
            <Button 
                type="submit" 
                variant="primary"
                disabled={submitDisabled}
                loading={submitLoading}
                form={submitForm}
            >
                {submitLabel}
            </Button>
        </div>
    )
}
