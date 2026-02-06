import Modal from '~/components/ui/Modal'
import MaintenanceForm from '~/components/dashboard/MaintenanceForm'

interface MaintenanceModalProps {
    isOpen: boolean
    onClose: () => void
    carId: number
    currentMileage?: number
    onSuccess?: () => void
}

export default function MaintenanceModal({
    isOpen,
    onClose,
    carId,
    currentMileage,
    onSuccess
}: MaintenanceModalProps) {
    const handleSuccess = () => {
        if (onSuccess) {
            onSuccess()
        }
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Maintenance Record"
            size="lg"
        >
            <MaintenanceForm
                carId={carId}
                currentMileage={currentMileage}
                onSuccess={handleSuccess}
                onCancel={onClose}
            />
        </Modal>
    )
}
